from fastapi import FastAPI, HTTPException, Depends, status, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_core.messages import HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import Graph
from langchain_core.runnables import RunnablePassthrough
import json
import re
import jwt
from tenacity import retry, stop_after_attempt, wait_exponential

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Security
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key")
JWT_ALGORITHM = "HS256"

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Initialize LLM
llm = ChatOpenAI(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    model_name="gpt-3.5-turbo"
)

# Memory cache for user preferences
user_preferences = {}

class Token(BaseModel):
    access_token: str
    token_type: str

class UserPreferences(BaseModel):
    preferred_brands: List[str] = []
    preferred_categories: List[str] = []
    price_range: Optional[Dict[str, float]] = None
    last_queries: List[str] = []

class AnalyticsData(BaseModel):
    total_queries: int
    popular_categories: Dict[str, int]
    average_confidence: float
    query_history: List[Dict[str, Any]]

class ComparisonRequest(BaseModel):
    product_ids: List[str]

# JWT Authentication
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=1)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# User preferences management
def get_user_preferences(user_id: str) -> UserPreferences:
    if user_id not in user_preferences:
        user_preferences[user_id] = UserPreferences()
    return user_preferences[user_id]

def update_user_preferences(user_id: str, query: str, results: QueryResult):
    prefs = get_user_preferences(user_id)
    
    # Update last queries
    prefs.last_queries = [query] + prefs.last_queries[:4]
    
    # Update preferred categories and brands from successful searches
    if results.products:
        categories = set(p["category"] for p in results.products)
        brands = set(p["brand"] for p in results.products)
        
        prefs.preferred_categories = list(set(prefs.preferred_categories) | categories)[:5]
        prefs.preferred_brands = list(set(prefs.preferred_brands) | brands)[:5]

# Product comparison
@app.post("/api/compare")
async def compare_products(
    request: ComparisonRequest,
    token: dict = Depends(verify_token)
):
    try:
        products = await get_products_by_ids(request.product_ids)
        comparison = create_comparison_analysis(products)
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_products_by_ids(product_ids: List[str]):
    result = supabase.table("products").select("*").in_("id", product_ids).execute()
    return result.data

def create_comparison_analysis(products: List[Dict[str, Any]]):
    if not products:
        return {"error": "No products found"}
    
    # Create comparison matrix
    fields = ["name", "brand", "price", "category", "description"]
    comparison = {
        "products": products,
        "differences": {},
        "similarities": {},
        "price_comparison": {
            "lowest": min(p["price"] for p in products),
            "highest": max(p["price"] for p in products),
            "average": sum(p["price"] for p in products) / len(products)
        }
    }
    
    # Analyze differences and similarities
    for field in fields:
        values = set(str(p[field]) for p in products)
        if len(values) > 1:
            comparison["differences"][field] = {
                p["id"]: p[field] for p in products
            }
        else:
            comparison["similarities"][field] = list(values)[0]
    
    return comparison

# Analytics
@app.get("/api/analytics")
async def get_analytics(token: dict = Depends(verify_token)):
    try:
        # Get query history
        history = supabase.table("chat_messages").select("*").execute()
        
        # Calculate analytics
        total_queries = len(history.data)
        categories = {}
        confidence_sum = 0
        confidence_count = 0
        
        for msg in history.data:
            if msg.get("metadata", {}).get("search_terms", {}).get("category"):
                category = msg["metadata"]["search_terms"]["category"]
                categories[category] = categories.get(category, 0) + 1
            
            if msg.get("metadata", {}).get("confidence_score"):
                confidence_sum += msg["metadata"]["confidence_score"]
                confidence_count += 1
        
        return AnalyticsData(
            total_queries=total_queries,
            popular_categories=categories,
            average_confidence=confidence_sum / confidence_count if confidence_count > 0 else 0,
            query_history=[{
                "query": msg["content"],
                "timestamp": msg["created_at"],
                "confidence": msg.get("metadata", {}).get("confidence_score", 0)
            } for msg in history.data[-10:]]  # Last 10 queries
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Enhanced query processing with memory
@app.post("/api/query")
async def process_query(
    request: QueryRequest,
    token: dict = Depends(verify_token)
):
    try:
        # Get user preferences
        prefs = get_user_preferences(request.user_id)
        
        # Enhance query with user preferences
        enhanced_filters = request.filters or {}
        if prefs.preferred_categories:
            enhanced_filters["preferred_categories"] = prefs.preferred_categories
        if prefs.preferred_brands:
            enhanced_filters["preferred_brands"] = prefs.preferred_brands
        
        # Execute workflow
        result = await query_workflow.arun(
            request.query,
            config={
                "metadata": {
                    "user_id": request.user_id,
                    "filters": enhanced_filters
                }
            }
        )
        
        # Update user preferences
        update_user_preferences(request.user_id, request.query, result)
        
        # Save to chat history with enhanced metadata
        chat_message = {
            "role": "assistant",
            "content": result,
            "user_id": request.user_id,
            "metadata": {
                "query": request.query,
                "filters": enhanced_filters,
                "preferences": prefs.dict(),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        supabase.table("chat_messages").insert(chat_message).execute()
        
        return QueryResponse(
            content=result,
            created_at=datetime.now(),
            metadata=chat_message["metadata"]
        )
        
    except Exception as e:
        error_message = str(e)
        suggestion = "Please try rephrasing your query or providing more specific details."
        
        if "database" in error_message.lower():
            suggestion = "There seems to be an issue with the database. Please try again in a moment."
        elif "processing" in error_message.lower():
            suggestion = "The query could not be processed. Please try simplifying your request."
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": error_message,
                "suggestion": suggestion
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
## AI-Powered Chatbot for Supplier and Product Information

## Overview

This project is an AI-powered chatbot that allows users to query a product and supplier database using natural language. The chatbot interacts with an open-source language model (LLM) for summarization and utilizes the LangGraph framework to fetch data from a MySQL/PostgreSQL database.

## Features
Natural language interaction for querying product and supplier information.
Summarization of supplier data using LLM.
A responsive web interface for chatbot interaction.
Support for structured queries and intelligent responses.
Graceful handling of incorrect or missing queries.

## Tech Stack
### Frontend:
React: Frontend framework for building the user interface.
Tailwind CSS/Material UI: Styling library for UI components.
Axios: HTTP client for making API requests.
Redux/Context API: State management for the frontend.

### Backend:
Python (FastAPI/Flask): Backend framework for handling API requests.
LangGraph: Framework for chatbot workflow management.
Open-Source LLM (Hugging Face's GPT-2/GPT-3 or LLaMA 2): Used for natural language summarization.

### Database:
MySQL/PostgreSQL: Database to store product and supplier information.

# Installation Instructions:
1. Clone the Repository:
git clone <repository-url>
cd ai-powered-chatbot

1. Frontend Setup:
cd frontend
npm install
npm start

1. Backend Setup:
Create a virtual environment:
python3 -m venv venv
source venv/bin/activate

# Install the necessary dependencies:
pip install -r requirements.txt

Configure environment variables (e.g., database connection): Create a .env file in the backend directory with the following content:
DB_HOST=<your-database-host>
DB_PORT=<your-database-port>
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
DB_NAME=<your-database-name>
LLM_API_KEY=<your-llm-api-key>

# Run the backend:
uvicorn app.main:app --reload

1. Database Setup:
Connect to your MySQL/PostgreSQL database.

Run the SQL script schema.sql to create the necessary tables:
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    contact_info TEXT,
    product_categories TEXT
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    brand VARCHAR(255),
    price DECIMAL(10, 2),
    category VARCHAR(255),
    description TEXT,
    supplier_id INT REFERENCES suppliers(id)
);

Populate the database with sample data using the script seed.sql.

# Usage
Open the frontend in a browser at http://localhost:3000.

The chatbot will retrieve relevant data from the database and enhance the response with LLM-generated summaries.

# Bonus Features (Optional)
JWT Authentication: Secure access with JSON Web Tokens.
Product Comparisons: Enable users to compare multiple products side by side.
Chatbot Memory: Store user preferences for personalized responses.
Analytics Dashboard: Track and visualize the most common queries.

# Future Improvements
Add support for voice-based queries.
Implement additional LLM-based features such as conversation memory.
Scale the system to handle large datasets and real-time user interactions.

# License
This project is licensed under the MIT License.


Developed by Ashvani S !!!





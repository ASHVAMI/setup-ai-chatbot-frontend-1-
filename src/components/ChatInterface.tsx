import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { ChatMessage, Product } from '../types';
import {
  searchProducts,
  searchSuppliers,
  saveChatMessage,
  getChatHistory,
  compareProducts,
  signOut,
} from '../lib/supabase';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      setMessages(history.reverse());
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const processQuery = async (query: string) => {
    try {
      if (query.toLowerCase().includes('compare')) {
        setComparisonMode(true);
        return 'Please enter the names of the products you want to compare, one at a time. Type "done" when finished.';
      }

      if (comparisonMode) {
        if (query.toLowerCase() === 'done') {
          setComparisonMode(false);
          if (selectedProducts.length < 2) {
            return 'Please select at least two products to compare.';
          }
          const products = await compareProducts(selectedProducts);
          setSelectedProducts([]);
          return formatComparison(products);
        }

        const products = await searchProducts(query);
        if (products.length > 0) {
          setSelectedProducts(prev => [...prev, products[0].id]);
          return `Added ${products[0].name} to comparison. Type "done" when finished or add another product.`;
        }
        return 'Product not found. Please try another product name.';
      }

      let response = '';
      
      if (query.toLowerCase().includes('product') || query.toLowerCase().includes('brand')) {
        const products = await searchProducts(query);
        if (products.length > 0) {
          response += 'Products:\n' + products.map(p => 
            `- ${p.name} (${p.brand}): $${p.price} - ${p.description}`
          ).join('\n');
        } else {
          response += 'No products found matching your query.';
        }
      }
      
      if (query.toLowerCase().includes('supplier') || query.toLowerCase().includes('provider')) {
        const suppliers = await searchSuppliers(query);
        if (suppliers.length > 0) {
          response += '\n\nSuppliers:\n' + suppliers.map(s => 
            `- ${s.name} (${s.categories.join(', ')})\n  Contact: ${s.email}`
          ).join('\n');
        } else {
          response += '\n\nNo suppliers found matching your query.';
        }
      }
      
      return response || 'I can help you find products and suppliers. Try asking about specific products, brands, or suppliers.';
    } catch (error) {
      console.error('Error processing query:', error);
      return 'Sorry, I encountered an error while processing your request. Please try again.';
    }
  };

  const formatComparison = (products: Product[]) => {
    const fields = ['name', 'brand', 'price', 'category', 'description'];
    let comparison = 'Product Comparison:\n\n';

    fields.forEach(field => {
      comparison += `${field.charAt(0).toUpperCase() + field.slice(1)}:\n`;
      products.forEach(product => {
        comparison += `- ${product.name}: ${product[field as keyof Product]}\n`;
      });
      comparison += '\n';
    });

    return comparison;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    await saveChatMessage('user', input);
    setInput('');

    try {
      const response = await processQuery(input);
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
      await saveChatMessage('assistant', response);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold">Product Assistant</h1>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 text-gray-600 hover:text-gray-800"
          title="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 border'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {format(new Date(message.created_at), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              comparisonMode
                ? 'Enter product name or "done" to finish comparison'
                : 'Ask about products or suppliers...'
            }
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
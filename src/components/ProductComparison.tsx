import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  category: string;
  description: string;
}

interface ComparisonProps {
  products: Product[];
  onClose: () => void;
}

export default function ProductComparison({ products, onClose }: ComparisonProps) {
  const fields = [
    { key: 'name', label: 'Name' },
    { key: 'brand', label: 'Brand' },
    { key: 'price', label: 'Price', format: (value: number) => `$${value.toFixed(2)}` },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' }
  ];

  const priceStats = {
    lowest: Math.min(...products.map(p => p.price)),
    highest: Math.max(...products.map(p => p.price)),
    average: products.reduce((acc, p) => acc + p.price, 0) / products.length
  };

  const renderPriceComparison = (price: number) => {
    const percentage = ((price - priceStats.lowest) / (priceStats.highest - priceStats.lowest)) * 100;
    return (
      <div className="relative w-full h-2 bg-gray-200 rounded-full mt-1">
        <div
          className="absolute h-full bg-blue-600 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute w-2 h-2 bg-red-500 rounded-full transform -translate-y-1/4"
          style={{ left: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Product Comparison</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Price Overview */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Price Comparison</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Lowest</p>
                <p className="text-lg font-bold text-green-600">
                  ${priceStats.lowest.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Average</p>
                <p className="text-lg font-bold text-blue-600">
                  ${priceStats.average.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Highest</p>
                <p className="text-lg font-bold text-red-600">
                  ${priceStats.highest.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 bg-gray-50"></th>
                  {products.map((product) => (
                    <th key={product.id} className="px-4 py-2 bg-gray-50">
                      <div className="text-left">
                        <h3 className="font-bold">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.brand}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(({ key, label, format }) => (
                  <tr key={key} className="border-t">
                    <td className="px-4 py-2 font-medium text-gray-700">
                      {label}
                    </td>
                    {products.map((product) => (
                      <td key={product.id} className="px-4 py-2">
                        <div>
                          {format
                            ? format(product[key as keyof Product] as any)
                            : product[key as keyof Product]}
                          {key === 'price' &&
                            renderPriceComparison(product.price)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendation */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Our Recommendation</h3>
            <p className="text-gray-700">
              {products.find(p => p.price === priceStats.lowest)?.name} offers the
              best value for money in this comparison.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
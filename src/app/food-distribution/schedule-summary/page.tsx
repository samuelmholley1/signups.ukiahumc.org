export default function FoodScheduleSummary() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Food Distribution Schedule Summary
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <p className="text-blue-900 text-center font-medium">
            🚧 Coming Soon!
          </p>
          <p className="text-blue-800 text-center mt-2">
            Schedule summary will be available here shortly.
          </p>
        </div>
        
        <div className="text-center">
          <a 
            href="/food-distribution"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            ← Back to Food Distribution
          </a>
        </div>
      </div>
    </main>
  )
}

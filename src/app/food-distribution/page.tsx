export default function FoodDistributionSignup() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/logo-for-church-larger.jpg" 
            alt="Ukiah United Methodist Church" 
            className="w-64 md:w-80 h-auto rounded-lg shadow-lg"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-4">
          Food Distribution Signups
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <p className="text-blue-900 text-center font-medium">
            🚧 Coming Soon!
          </p>
          <p className="text-blue-800 text-center mt-2">
            Food distribution signups will be available here shortly.
          </p>
        </div>
        
        <div className="text-center">
          <a 
            href="/"
            className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  )
}

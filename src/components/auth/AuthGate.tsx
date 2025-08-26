interface AuthGateProps {
  onLogin: () => void;
}

export const AuthGate = ({ onLogin }: AuthGateProps) => (
  <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-lg border text-center max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        Login Required
      </h1>
      <p className="text-gray-600 mb-6">
        You need to be logged in to access the multiplayer rationale system.
      </p>
      <button
        onClick={onLogin}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Login
      </button>
    </div>
  </div>
);
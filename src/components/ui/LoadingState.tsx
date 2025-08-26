interface LoadingStateProps {
  message?: string;
}

export const LoadingState = ({ message = "Loading..." }: LoadingStateProps) => (
  <div className="fixed inset-0 top-16 bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);
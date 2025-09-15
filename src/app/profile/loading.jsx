export default function Loading() {
  return (
    <div className="container mx-auto p-4 max-w-3xl animate-pulse">
      <div className="h-6 w-32 bg-gray-300 rounded mb-4"></div>
      <div className="h-10 w-full bg-gray-200 rounded mb-2"></div>
      <div className="h-10 w-full bg-gray-200 rounded mb-2"></div>
      <div className="h-10 w-full bg-gray-200 rounded mb-6"></div>
      <div className="h-6 w-40 bg-gray-300 rounded mb-2"></div>
      <div className="h-10 w-full bg-gray-200 rounded"></div>
    </div>
  );
}

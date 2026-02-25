export default function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
    >
      {message}
    </div>
  );
}

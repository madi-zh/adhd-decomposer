export default function ErrorAlert({ message, className = "", id }: { message: string; className?: string; id?: string }) {
  return (
    <p id={id} role="alert" className={`text-red-500 text-sm ${className}`}>
      {message}
    </p>
  );
}

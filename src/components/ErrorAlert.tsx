interface ErrorAlertProps {
  message: string;
  className?: string;
  id?: string;
}

export default function ErrorAlert({ message, className = "", id }: ErrorAlertProps) {
  return (
    <p id={id} role="alert" className={`text-red-500 text-sm ${className}`}>
      {message}
    </p>
  );
}

export default function OrDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-stone-300" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-amber-50 px-2 text-stone-500">or</span>
      </div>
    </div>
  );
}

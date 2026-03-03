import TaskInput from "@/components/TaskInput";
import FocusRoomBadge from "@/components/FocusRoomBadge";

export default function Home() {
  return (
    <>
      <div className="flex justify-center mb-4">
        <FocusRoomBadge />
      </div>
      <TaskInput />
    </>
  );
}

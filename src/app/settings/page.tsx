import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import SettingsPanel from "@/components/SettingsPanel";

const DEFAULT_SETTINGS = {
  eveningCutoffHour: 23,
  eveningCutoffMin: 0,
  enableEveningMode: false,
  enableFocusTimer: true,
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id },
    select: {
      eveningCutoffHour: true,
      eveningCutoffMin: true,
      enableEveningMode: true,
      enableFocusTimer: true,
    },
  });

  return <SettingsPanel settings={settings ?? DEFAULT_SETTINGS} />;
}

import { useNavigation } from "@/runtime/navigation";

export default function Index() {
  const { Redirect } = useNavigation();

  return <Redirect href="/travel" />;
}

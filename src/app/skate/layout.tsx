import { NavSkate } from "@/components/skate/NavSkate";

export default function SkateLayout({ children }: LayoutProps<"/skate">) {
  return (
    <>
      <NavSkate />
      {children}
    </>
  );
}

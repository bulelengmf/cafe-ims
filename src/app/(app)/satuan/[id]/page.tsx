import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { Badge, PageHeader } from "@/components/ui";
import { getUnit } from "@/server/master/units";
import { UnitForm } from "../unit-form";

export const dynamic = "force-dynamic";

export default async function EditUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getUnit(getDb(), id);
  if (!u) notFound();
  return (
    <>
      <PageHeader title={`Ubah satuan: ${u.code}`} action={<Badge active={u.isActive} />} />
      <UnitForm initial={{ id: u.id, code: u.code, name: u.name, dimension: u.dimension }} />
    </>
  );
}

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatXOF, formatDate } from "@/lib/utils";
import PrintButton from "./print-button";

export default async function ImprimerFacturePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  if (!searchParams.id) notFound();

  const invoice = await db.invoice.findUnique({
    where: { id: searchParams.id },
    include: { items: true, customer: true },
  });

  if (!invoice) notFound();

  const branding = await db.branding.findFirst();

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 print:p-0">
      <div className="mb-4 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <header className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-laafi-bronze">
            {branding?.commercialName ?? "LAAFI CAFÉ"}
          </h1>
          <p className="text-sm text-neutral-500">{branding?.slogan}</p>
          <p className="mt-2 text-xs text-neutral-500">{branding?.address}</p>
          <p className="text-xs text-neutral-500">{branding?.phone}</p>
          {branding?.ifu && <p className="text-xs text-neutral-500">IFU : {branding.ifu}</p>}
          {branding?.rccm && <p className="text-xs text-neutral-500">RCCM : {branding.rccm}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-lg font-semibold text-neutral-900">FACTURE</h2>
          <p className="text-sm text-neutral-500">{invoice.number}</p>
          <p className="text-sm text-neutral-500">{formatDate(invoice.date)}</p>
        </div>
      </header>

      <section className="mb-6">
        <p className="text-xs font-medium uppercase text-neutral-400">Client</p>
        <p className="text-sm font-medium text-neutral-900">
          {invoice.customer.companyName ??
            `${invoice.customer.firstName} ${invoice.customer.lastName}`}
        </p>
        {invoice.customer.phone && (
          <p className="text-sm text-neutral-500">{invoice.customer.phone}</p>
        )}
        {invoice.customer.ifu && (
          <p className="text-sm text-neutral-500">IFU : {invoice.customer.ifu}</p>
        )}
      </section>

      <table className="mb-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qté</th>
            <th className="py-2 text-right">P.U.</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-100">
              <td className="py-2">{item.description}</td>
              <td className="py-2 text-right">{Number(item.quantity)}</td>
              <td className="py-2 text-right">{formatXOF(Number(item.unitPrice))}</td>
              <td className="py-2 text-right">{formatXOF(Number(item.total))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto w-56 space-y-1 text-sm">
        <div className="flex justify-between text-neutral-500">
          <span>Sous-total</span>
          <span>{formatXOF(Number(invoice.subtotal))}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>TVA incluse</span>
          <span>{formatXOF(Number(invoice.taxTotal))}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-300 pt-1 text-base font-semibold text-neutral-900">
          <span>Total TTC</span>
          <span>{formatXOF(Number(invoice.total))}</span>
        </div>
      </div>

      {invoice.notes && (
        <p className="mt-6 text-xs text-neutral-500">{invoice.notes}</p>
      )}

      <footer className="mt-12 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-400">
        Merci de votre confiance — {branding?.commercialName ?? "LAAFI CAFÉ"}
      </footer>
    </div>
  );
}

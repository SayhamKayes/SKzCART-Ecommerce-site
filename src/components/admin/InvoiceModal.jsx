import { X, Printer } from "lucide-react";
import { useMemo } from "react";
import { useThemeConfig } from "../frontPanel/FrontPanelContext";
import { buildInitialInvoiceData } from "../../utils/invoiceTemplates";
import { InvoiceSheetRenderer } from "./InvoiceSheetRenderer";

const InvoiceModal = ({ order, orders = [], onClose }) => {
  const { themeConfig } = useThemeConfig();

  const invoiceData = useMemo(() => {
    if (!order) return null;
    return buildInitialInvoiceData(order, orders, themeConfig);
  }, [order, orders, themeConfig]);

  if (!order || !invoiceData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:static print:inset-auto print:block print:overflow-visible print:p-0 print:bg-white">
      <div className="relative bg-white rounded-none max-w-3xl w-full overflow-hidden shadow-2xl p-4 sm:p-6 my-4 print:max-w-none print:w-full print:shadow-none print:border-none print:m-0 print:p-0 print:rounded-none print:overflow-visible">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-neutral-200 print:hidden">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Official Cash Memo / Invoice ({invoiceData.invoiceNumber})
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="py-1.5 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Shared 10-Template Printable Invoice Sheet */}
        <InvoiceSheetRenderer invoiceData={invoiceData} themeConfig={themeConfig} />
      </div>
    </div>
  );
};

export { InvoiceModal };
export default InvoiceModal;

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { ProductContainer, ProductHeader, ProductPage } from './product-system';

interface JourneyPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  onBack: () => void;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
  contentMaxWidthClass?: string;
  footerMaxWidthClass?: string;
}

export function JourneyPageShell({
  eyebrow,
  title,
  description,
  onBack,
  onClose,
  footer,
  children,
  contentMaxWidthClass = 'max-w-xl',
  footerMaxWidthClass = 'max-w-xl',
}: JourneyPageShellProps) {
  return (
    <ProductPage className="bg-[#ede4dc]">
      <ProductContainer className={`flex min-h-screen flex-col px-5 pb-28 pt-6 ${contentMaxWidthClass}`}>
        <ProductHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          onBack={onBack}
          actions={(
            <button
              type="button"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-[#f7efe9] text-foreground transition-colors active:scale-[0.98]"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        />
        <div className="flex-1">{children}</div>
      </ProductContainer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#ecd9cd] bg-[#ede4dc]/95 px-5 pb-5 pt-4 backdrop-blur">
        <div className={`mx-auto w-full ${footerMaxWidthClass}`}>
          {footer}
        </div>
      </div>
    </ProductPage>
  );
}

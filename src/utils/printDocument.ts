/**
 * Isolated A4 Print & PDF Utility + NPR Number-to-Words Converter
 * Clones the target document element into a dedicated top-level #app-print-root
 * outside #root so printing never inherits sidebar padding, scroll clipping, or
 * background page content.
 */

export function printElement(element: HTMLElement | null, documentTitle?: string): void {
  if (!element) {
    window.print();
    return;
  }

  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  // Create or reuse top-level print mount node outside #root
  let printRoot = document.getElementById('app-print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'app-print-root';
    document.body.appendChild(printRoot);
  }

  // Clone printable content cleanly
  printRoot.innerHTML = '';
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.height = 'auto';
  clone.style.padding = '0';
  clone.style.margin = '0';
  clone.style.width = '100%';
  printRoot.appendChild(clone);

  document.body.classList.add('is-printing-doc');

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('is-printing-doc');
    if (printRoot) {
      printRoot.innerHTML = '';
    }
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Allow browser layout to flush before triggering print dialog
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.print();
      // Safety fallback in environments where afterprint may not fire reliably
      setTimeout(cleanup, 1500);
    }, 60);
  });
}

/**
 * Converts a numeric NPR amount into formal English words for Nepal IRD Tax Invoices
 * Example: 14520.50 -> "Nepalese Rupees Fourteen Thousand Five Hundred Twenty and Fifty Paisa Only"
 */
export function numberToWordsNPR(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const whole = Math.floor(safeAmount);
  const paisa = Math.round((safeAmount - whole) * 100);

  if (whole === 0 && paisa === 0) {
    return 'Nepalese Rupees Zero Only';
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertBelowThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += `${ones[Math.floor(n / 100)]} Hundred`;
      n %= 100;
      if (n > 0) str += ' ';
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)];
      if (n % 10 > 0) str += ` ${ones[n % 10]}`;
    } else if (n > 0) {
      str += ones[n];
    }
    return str;
  };

  const convertNumber = (num: number): string => {
    if (num === 0) return 'Zero';
    const parts: string[] = [];

    const crore = Math.floor(num / 10000000);
    if (crore > 0) {
      parts.push(`${convertBelowThousand(crore)} Crore`);
      num %= 10000000;
    }

    const lakh = Math.floor(num / 100000);
    if (lakh > 0) {
      parts.push(`${convertBelowThousand(lakh)} Lakh`);
      num %= 100000;
    }

    const thousand = Math.floor(num / 1000);
    if (thousand > 0) {
      parts.push(`${convertBelowThousand(thousand)} Thousand`);
      num %= 1000;
    }

    if (num > 0) {
      parts.push(convertBelowThousand(num));
    }

    return parts.join(' ');
  };

  let result = `Nepalese Rupees ${convertNumber(whole)}`;
  if (paisa > 0) {
    result += ` and ${convertBelowThousand(paisa)} Paisa`;
  }
  return `${result} Only`;
}

export function formatNPR(value: number | undefined | null, decimals = 2): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return decimals > 0 ? '0.00' : '0';
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

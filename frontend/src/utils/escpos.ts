/**
 * Suvai ESC/POS Thermal Receipt Command Generator
 * Outputs standardized binary ESC/POS byte buffers for 58mm and 80mm printers.
 */

import { Order, BusinessSettings } from '../types';

export class EscPosBuilder {
  private buffer: number[] = [];
  private lineWidth: number;

  constructor(width: '58' | '80' = '80') {
    this.lineWidth = width === '58' ? 32 : 48;
    this.init();
  }

  init(): this {
    this.buffer.push(0x1B, 0x40); // ESC @ (Initialize printer)
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1B, 0x61, 0x01);
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1B, 0x61, 0x00);
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1B, 0x61, 0x02);
    return this;
  }

  bold(enable = true): this {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  doubleSize(): this {
    this.buffer.push(0x1D, 0x21, 0x11); // GS ! 0x11 (Double width & height)
    return this;
  }

  normalSize(): this {
    this.buffer.push(0x1D, 0x21, 0x00); // Normal text
    return this;
  }

  text(str: string): this {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  newLine(): this {
    this.buffer.push(0x0A);
    return this;
  }

  divider(char = '-'): this {
    this.alignLeft();
    this.text(char.repeat(this.lineWidth));
    this.newLine();
    return this;
  }

  /**
   * Two-column justification: Left text and Right text on same row
   */
  rowTwoCols(left: string, right: string): this {
    this.alignLeft();
    const available = this.lineWidth - right.length;
    let safeLeft = left;
    if (safeLeft.length > available - 1) {
      safeLeft = safeLeft.substring(0, available - 1);
    }
    const spaces = ' '.repeat(Math.max(1, this.lineWidth - safeLeft.length - right.length));
    this.text(safeLeft + spaces + right);
    this.newLine();
    return this;
  }

  /**
   * Three-column item row: Name | Qty | Total
   */
  itemRow(name: string, qty: number, total: string): this {
    this.alignLeft();
    if (this.lineWidth === 32) {
      // 58mm format: Name (17) | Qty (3) | Total (12)
      const qtyStr = `x${qty}`;
      const rightPart = `${qtyStr.padStart(4)} ${total.padStart(8)}`;
      const maxNameLen = this.lineWidth - rightPart.length;
      const safeName = name.length > maxNameLen ? name.substring(0, maxNameLen) : name.padEnd(maxNameLen);
      this.text(safeName + rightPart);
      this.newLine();
    } else {
      // 80mm format: Name (26) | Qty (5) | Price (7) | Total (10)
      const qtyStr = String(qty).padStart(4);
      const rightPart = `${qtyStr} ${total.padStart(12)}`;
      const maxNameLen = this.lineWidth - rightPart.length;
      const safeName = name.length > maxNameLen ? name.substring(0, maxNameLen) : name.padEnd(maxNameLen);
      this.text(safeName + rightPart);
      this.newLine();
    }
    return this;
  }

  feed(lines = 3): this {
    this.buffer.push(0x1B, 0x64, lines);
    return this;
  }

  cut(): this {
    this.buffer.push(0x1D, 0x56, 0x42, 0x00); // GS V 66 0
    return this;
  }

  kickDrawer(): this {
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA); // ESC p 0 25 250
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toHex(): string {
    return Array.from(this.buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

/**
 * Builds complete thermal receipt ESC/POS binary data
 */
export function buildOrderReceiptBytes(order: Order, settings: Partial<BusinessSettings> = {}): { bytes: Uint8Array; hex: string } {
  const width = settings.printer_width || '80';
  const builder = new EscPosBuilder(width);

  // Cash drawer kick if enabled
  if (settings.printer_open_drawer === 'true') {
    builder.kickDrawer();
  }

  // Header
  builder.alignCenter();
  builder.bold(true).doubleSize();
  builder.text(settings.business_name || 'SUVAI CANTEEN');
  builder.newLine();
  builder.normalSize().bold(false);

  if (settings.college_name) {
    builder.text(settings.college_name);
    builder.newLine();
  }
  if (settings.campus_branch) {
    builder.text(settings.campus_branch);
    builder.newLine();
  }
  if (settings.phone) {
    builder.text(`Ph: ${settings.phone}`);
    builder.newLine();
  }

  builder.divider('=');

  // Token Number Highlight
  if (order.token_number) {
    builder.alignCenter();
    builder.bold(true).doubleSize();
    builder.text(`TOKEN #${order.token_number}`);
    builder.newLine();
    builder.normalSize().bold(false);
    builder.divider('-');
  }

  // Meta: Bill #, Date, Time, Payment
  builder.alignLeft();
  builder.rowTwoCols('Bill No:', order.bill_number);
  const orderDate = new Date(order.order_date || Date.now());
  builder.rowTwoCols('Date:', orderDate.toLocaleDateString('en-IN'));
  builder.rowTwoCols('Time:', orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  builder.rowTwoCols('Customer:', order.customer_name || 'Walk-in');
  builder.rowTwoCols('Payment:', (order.payment_method || 'CASH').toUpperCase());

  builder.divider('-');

  // Items Header
  if (width === '58') {
    builder.rowTwoCols('ITEM / QTY', 'AMOUNT');
  } else {
    builder.rowTwoCols('ITEM DESCRIPTION', 'QTY       AMOUNT');
  }
  builder.divider('-');

  // Items list
  const currency = settings.currency_symbol || 'Rs.';
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      const itemTotal = `${currency}${Number(item.subtotal || item.quantity * item.unit_price).toFixed(2)}`;
      builder.itemRow(item.product_name, item.quantity, itemTotal);
    }
  }

  builder.divider('-');

  // Totals
  builder.rowTwoCols('Subtotal:', `${currency}${Number(order.subtotal || order.grand_total).toFixed(2)}`);

  if (Number(order.discount_amount) > 0) {
    builder.rowTwoCols('Discount:', `-${currency}${Number(order.discount_amount).toFixed(2)}`);
  }

  if (Number(order.tax_amount) > 0) {
    builder.rowTwoCols('GST / Tax:', `${currency}${Number(order.tax_amount).toFixed(2)}`);
  }

  builder.divider('=');
  builder.bold(true).doubleSize();
  builder.rowTwoCols('TOTAL:', `${currency}${Number(order.grand_total).toFixed(2)}`);
  builder.normalSize().bold(false);
  builder.divider('=');

  // Footer message
  builder.alignCenter();
  if (settings.printer_footer) {
    settings.printer_footer.split('\n').forEach(line => {
      builder.text(line.trim());
      builder.newLine();
    });
  } else {
    builder.text('Thank you for dining with Suvai!');
    builder.newLine();
    builder.text('Tokens valid for today only.');
    builder.newLine();
  }

  builder.feed(4);

  // Auto cut
  if (settings.printer_auto_cut !== 'false') {
    builder.cut();
  }

  return {
    bytes: builder.toBytes(),
    hex: builder.toHex()
  };
}

/**
 * Builds test receipt bytes
 */
export function buildTestReceiptBytes(settings: Partial<BusinessSettings> = {}): { bytes: Uint8Array; hex: string } {
  const width = settings.printer_width || '80';
  const builder = new EscPosBuilder(width);

  builder.alignCenter();
  builder.bold(true).doubleSize();
  builder.text('SUVAI CANTEEN');
  builder.newLine();
  builder.normalSize().bold(false);
  builder.text('PRINTER TEST CONFIRMATION');
  builder.newLine();
  builder.divider('=');

  builder.rowTwoCols('Width Mode:', `${width}mm (${width === '58' ? 32 : 48} Columns)`);
  builder.rowTwoCols('Test Date:', new Date().toLocaleDateString('en-IN'));
  builder.rowTwoCols('Test Time:', new Date().toLocaleTimeString('en-IN'));
  builder.rowTwoCols('Status:', 'ONLINE & VERIFIED');

  builder.divider('-');
  builder.alignCenter();
  builder.text('If you can read this clearly,');
  builder.newLine();
  builder.text('your thermal printer is ready for billing!');
  builder.newLine();
  builder.feed(3);
  builder.cut();

  return {
    bytes: builder.toBytes(),
    hex: builder.toHex()
  };
}

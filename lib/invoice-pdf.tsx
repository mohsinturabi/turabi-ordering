import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { Order, Tenant, RestaurantTable } from './types';

interface InvoiceData {
  order: Order;
  tenant: Tenant;
  table: RestaurantTable | null;
  customerName: string | null;
  customerMobile: string | null;
  items: { name: string; quantity: number; price: number }[];
  invoiceNumber: string;
  qrDataUrl: string;
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logo: { width: 40, height: 40, borderRadius: 4 },
  restaurantName: { fontSize: 16, fontWeight: 700 },
  invoiceLabel: { fontSize: 14, fontWeight: 700, textAlign: 'right' },
  meta: { color: '#555', marginTop: 2, textAlign: 'right' },
  section: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#555' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4, marginBottom: 4, fontWeight: 700 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#333' },
  totalLabel: { fontSize: 12, fontWeight: 700 },
  totalValue: { fontSize: 12, fontWeight: 700 },
  footer: { marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qr: { width: 64, height: 64 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, fontSize: 9, fontWeight: 700 },
  paid: { backgroundColor: '#E4EEE7', color: '#3F7D57' },
  unpaid: { backgroundColor: '#F2E4D8', color: '#C1440E' },
  refunded: { backgroundColor: '#EEE', color: '#666' },
});

export default function InvoiceDocument({
  order,
  tenant,
  table,
  customerName,
  customerMobile,
  items,
  invoiceNumber,
  qrDataUrl,
}: InvoiceData) {
  const dateObj = new Date(order.created_at);
  const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const isCounter = order.order_type === 'counter';
  
  return (
    <Document>
      <Page size="A5" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {tenant.logo_url && <Image src={tenant.logo_url} style={styles.logo} />}
            <Text style={styles.restaurantName}>{tenant.name}</Text>
          </View>
          <View>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.meta}>{invoiceNumber}</Text>
            <Text style={styles.meta}>{dateStr}, {timeStr}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Order ID</Text>
            <Text>{order.order_code}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{isCounter ? 'Order type' : 'Table'}</Text>
            <Text>{isCounter ? 'Pickup from Counter' : (table?.table_number ?? '—')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Customer</Text>
            <Text>{customerName ?? 'Guest'} · {customerMobile ?? 'No number'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.colName}>Item</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Price</Text>
            <Text style={styles.colTotal}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>₹{item.price.toFixed(2)}</Text>
              <Text style={styles.colTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
  <View>
    <Text style={styles.label}>
      {order.payment_method === 'online'
        ? 'Paid online'
        : order.payment_mode === 'cash'
        ? 'Paid — Cash'
        : order.payment_mode === 'upi'
        ? 'Paid — UPI'
        : 'Pay at counter'}
    </Text>
    <Text
      style={[
        styles.badge,
        (() => {
          const status = (order?.payment_status || '').toLowerCase();
          switch (status) {
            case 'paid':
              return styles.statusPaid ?? { backgroundColor: '#4CAF50' };
            case 'pending':
              return styles.statusPending ?? { backgroundColor: '#FFC107' };
            case 'unpaid':
            case 'failed':
              return styles.statusUnpaid ?? { backgroundColor: '#F44336' };
            default:
              return styles.statusDefault ?? {};
          }
        })(),
        { marginTop: 4 },
      ]}
    >
      {order.payment_status.toUpperCase()}
    </Text>
  </View>
  <Image src={qrDataUrl} style={styles.qr} />
</View>
      </Page>
    </Document>
  );
}

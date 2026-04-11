import { defineStore } from 'pinia'
import api from '../utils/api'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    // Website CMS Sections
    siteContent: {
      home: { 
        carousel: [], 
        megaPromos: [], 
        videoBlock: { 
          title: { text: '', color: '#000000', size: 48, bold: true }, 
          description: { text: '', color: '#64748b', size: 16 },
          perks: [],
          perkStyle: { size: 10, color: '#000000', bold: true }
        },
        vipBanner: {
          title: { text: '', color: '#ffffff', size: 32, bold: true },
          description: { text: '', color: '#ffffff', size: 14 }
        },
        whatWeDo: {},
        categories: [],
        trustFeatures: [],
        productSections: { newArrivals: {}, mostPopular: {} },
        newsletter: {}
      },
      standard: { features: [] },
      process: { 
        hero: { 
          title: { text: '', color: '#ffffff', size: 64, bold: true }, 
          subtitle: { text: '', color: '#ffffff', size: 20 } 
        }, 
        steps: [], 
        cta: { 
          title: { text: '', color: '#000000', size: 42, bold: true }, 
          subtitle: { text: '', color: '#666666', size: 18 } 
        } 
      },
      contact: { direct: { phone: [] } },
      policies: { 
        shippingAndReturns: { 
          pageTitle: '', 
          shippingProcess: { title: '', content: '' },
          refundPolicy: { title: '', content: '' }
        },
        faq: { pageTitle: 'Frequently Asked Questions', items: [] },
        privacy: { pageTitle: 'Privacy Policy', content: '' },
        terms: { pageTitle: 'Terms of Service', subtitle: '', lastUpdated: '', items: [] }
      }
    },

    // CRM & Business Data
    products: [],
    orders: [],
    customers: [],
    
    // Employee & Operations Data
    employees: [],
    attendance: [],
    attendanceAuditLog: [],
    payroll: [],
    
    // Marketing & Inbox
    inquiries: [],
    blogs: [],
    subscribers: [],
    notifications: [],
    
    // Financials & Partners
    inventoryInvoices: [],
    inventoryReport: { summary: {}, records: [] },
    inventoryLastKey: null,
    dashboardStats: null,
    s3BucketUrl: import.meta.env.VITE_S3_BUCKET_URL || 'https://weardynamite-dev-assets.s3.ap-southeast-2.amazonaws.com/',
    vendors: [],
    ledger: [],
    expenses: [],
    vendorTransactions: [],
    revenueChart: [],
    topProducts: [],
    
    // UI State
    loading: false,
    error: null,
    imagePreview: {
      show: false,
      images: [],
      currentIndex: 0
    },
    notification: {
      show: false,
      title: '',
      message: '',
      type: 'info' // 'success' | 'error' | 'info' | 'warning'
    }
  }),

  getters: {
    getVendorBalance: (state) => (vendorId) => {
      const transactions = (state.vendorTransactions || []).filter(t => String(t.vendorId) === String(vendorId))
      const bills = transactions.filter(t => t.type === 'Bill').reduce((sum, t) => sum + t.amount, 0)
      const payments = transactions.filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0)
      return bills - payments
    },
    getVendorHistory: (state) => (vendorId) => {
      return (state.vendorTransactions || [])
        .filter(t => String(t.vendorId) === String(vendorId))
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    }
  },

  actions: {
    // ─── Initializer ─────────────────────────────────────────────────────────────
    async init() {
      await this.fetchProducts();
      await this.fetchCms();
      this.fetchVendors();
      this.fetchEmployees();
      this.fetchInventoryInvoices();
      this.fetchInventoryReport();
      this.fetchDashboardStats();
      this.fetchLedger();
      this.fetchDashboardAnalytics();
      this.fetchNotifications();
    },

    // ─── Utility Actions ─────────────────────────────────────────────────────────
    resolveImageUrl(path) {
      if (!path) return '';
      if (path.startsWith('http') || path.startsWith('data:image')) return path;
      const baseUrl = this.s3BucketUrl.endsWith('/') ? this.s3BucketUrl : `${this.s3BucketUrl}/`;
      return `${baseUrl}${path}`;
    },
    isVideo(path) {
      if (!path) return false;
      const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
      return videoExtensions.some(ext => path.toLowerCase().endsWith(ext));
    },

    async getPresignedUrl(fileName, fileType, folder = 'inventory') {
      try {
        const response = await api.post('/admin/upload/presigned-url', { fileName, fileType, folder });
        return response.data;
      } catch (error) {
        console.error('Failed to get presigned URL:', error);
        throw error;
      }
    },
    async uploadToS3(uploadUrl, file) {
      try {
        await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });
      } catch (error) {
        console.error('Direct S3 Upload Failed:', error);
        throw error;
      }
    },

    // ─── Blog Engine Actions (Prioritized) ───────────────────────────────────────
    async fetchBlogs() {
      try {
        const response = await api.get('/blogs/admin/list');
        this.blogs = response.data.items || response.data || [];
      } catch (error) {
        console.error('Failed fetch blogs:', error);
        this.blogs = [];
      }
    },
    async addBlog(blog) {
      try {
        const response = await api.post('/blogs/admin', blog);
        this.blogs.unshift(response.data);
        this.showNotification('Success', 'Article created as Draft.', 'success');
        return response.data;
      } catch (error) {
        this.showNotification('Error', 'Failed to create article.', 'error');
        throw error;
      }
    },
    async updateBlog(blog) {
      try {
        const response = await api.put(`/blogs/admin/${blog.id || blog.blogId}`, blog);
        const updated = response.data;
        const newId = updated.id || updated.blogId;
        const oldId = blog.id || blog.blogId;

        if (newId !== oldId) {
          // A brand new Physical Copy was created (First edit to a Live article)
          // We keep the old Live blog in the list and unshift the new staged one
          this.blogs.unshift(updated);
        } else {
          // This is a standard update to an already staged version
          const idx = this.blogs.findIndex(b => (b.id || b.blogId) === newId && b.SK === updated.SK);
          if (idx !== -1) {
            this.blogs[idx] = updated;
          } else {
            this.blogs.unshift(updated);
          }
        }
        this.showNotification('Success', 'Changes saved to staging version.', 'success');
        return updated;
      } catch (error) {
        this.showNotification('Error', 'Failed to save changes.', 'error');
        throw error;
      }
    },
    async publishBlog(stagedId) {
       try {
         const response = await api.post(`/blogs/admin/${stagedId}/publish`);
         const liveRecord = response.data;
         const originalId = liveRecord.id || liveRecord.blogId;

         // 1. Remove the staged record from our local list
         this.blogs = this.blogs.filter(b => (b.id || b.blogId) !== stagedId);
         
         // 2. Update or add the original Live record in our local list
         const liveIdx = this.blogs.findIndex(b => (b.id || b.blogId) === originalId && (b.status === 'Live' || b.SK === 'VERSION#LIVE'));
         if (liveIdx !== -1) {
           this.blogs[liveIdx] = liveRecord;
         } else {
           this.blogs.unshift(liveRecord);
         }

         this.showNotification('Deployed', 'Story is now Live on the website.', 'success');
         return liveRecord;
       } catch (error) {
         this.showNotification('Error', 'Deployment failed.', 'error');
         throw error;
       }
    },
    async deleteBlog(id) {
      try {
        await api.delete(`/blogs/admin/${id}`);
        this.blogs = this.blogs.filter(b => (b.id || b.blogId) !== id);
        this.showNotification('Deleted', 'Article and all versions removed.', 'success');
      } catch (error) {
        this.showNotification('Error', 'Failed to delete article.', 'error');
      }
    },

    // ─── Broadcast & Marketing Actions ──────────────────────────────────────────
    async fetchNotifications() {
      try {
        const response = await api.get('/notifications/admin/broadcast');
        this.notifications = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Failed to fetch broadcasts:', error);
      }
    },
    async broadcastNotification(payload) {
      this.loading = true;
      try {
        const response = await api.post('/notifications/admin/broadcast', payload);
        this.showNotification('Broadcast Started', 'Your messages are being dispatched across selected channels.', 'success');
        this.fetchNotifications(); // Refresh list to show the new campaign
        return response.data;
      } catch (error) {
        this.showNotification('Broadcast Failed', error.response?.data?.message || 'Check your targets and try again.', 'error');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ─── Product Actions ─────────────────────────────────────────────────────────
    async fetchProducts() {
      this.loading = true;
      try {
        const response = await api.get('/products/admin/products?limit=1000');
        const data = response.data.items || response.data || [];
        this.products = Array.isArray(data) ? data.map(p => ({
            ...p,
            id: p.product_id || p.productId || p.id,
            name: p.product_name || p.name
        })) : [];
      } catch (error) {
        console.error('Failed to fetch products:', error);
        this.products = [];
      } finally {
        this.loading = false;
      }
    },
    async addProduct(product) {
      this.loading = true;
      try {
        const response = await api.post('/products/admin/products', product);
        const mapped = {
          ...response.data,
          id: response.data.product_id || response.data.productId || response.data.id,
          name: response.data.product_name || response.data.name
        };
        this.products.unshift(mapped);
        return mapped;
      } catch (error) {
        console.error('Failed to add product:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async updateProduct(product) {
      this.loading = true;
      try {
        const response = await api.put(`/products/admin/products/${product.id}`, product);
        const mapped = {
          ...response.data,
          id: response.data.product_id || response.data.productId || response.data.id,
          name: response.data.product_name || response.data.name
        };
        const index = this.products.findIndex(p => String(p.id) === String(product.id));
        if (index !== -1) this.products[index] = mapped;
        return mapped;
      } catch (error) {
        console.error('Failed to update product:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async deleteProduct(id) {
      this.loading = true;
      try {
        await api.delete(`/products/admin/products/${id}`);
        this.products = this.products.filter(p => String(p.id) !== String(id));
      } catch (error) {
        console.error('Failed to delete product:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async bulkUpdateProductStatus(productIds, status) {
      this.loading = true;
      try {
        const response = await api.patch('/products/admin/products/bulk-status', { productIds, status });
        
        // Update local state for all affected products
        if (response.data && response.data.results) {
          response.data.results.forEach(res => {
            const isSuccess = res.status === 'fulfilled' || res.status === 'success';
            if (isSuccess) {
              const index = this.products.findIndex(p => String(p.id) === String(res.id));
              if (index !== -1) {
                this.products[index].status = status;
              }
            }
          });
        }
        
        return response.data;
      } catch (error) {
        console.error('Failed to bulk update status:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ─── Order & Customer Actions ────────────────────────────────────────────────
    async fetchOrders(params = {}) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/orders', { params });
        const data = Array.isArray(response.data) ? response.data : [];
        this.orders = data.map(o => ({
          ...o,
          id: o.order_id || o.id,
          date: (() => {
            const d = new Date(o.created_at || o.date)
            return isNaN(d.getTime()) ? '-' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
          })(),
          total: o.total_amount || o.totalUSD || o.total
        }));
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        this.orders = [];
        this.error = 'Connection to ordering system lost.';
      } finally {
        this.loading = false;
      }
    },
    async fetchOrderDetail(orderId) {
      this.loading = true;
      try {
        const response = await api.get(`/admin/orders/${orderId}`);
        const order = {
          ...response.data,
          id: response.data.order_id || response.data.id,
          date: (() => {
            const d = new Date(response.data.created_at || response.data.date)
            return isNaN(d.getTime()) ? '-' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
          })(),
          total: response.data.total_amount || response.data.total
        };
        return order;
      } catch (error) {
        console.error('Failed to fetch order detail:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    async fetchCustomers() {
      try {
        const response = await api.get('/user/admin/users');
        this.customers = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Failed to fetch customers:', error);
        this.customers = [];
      }
    },
    async updateOrderStatus(id, status) {
      try {
        await api.put(`/admin/orders/${id}/status`, { status });
        const order = this.orders.find(o => String(o.id) === String(id));
        if (order) order.status = status;
        if (status === 'Delivered') this.fetchDailySummary(new Date().toISOString().split('T')[0]);
      } catch (error) {
        console.error('Failed to update order status:', error);
      }
    },
    async updateOrderTracking(id, trackingNumber, courier) {
      try {
        await api.put(`/admin/orders/${id}/tracking`, { trackingNumber, courier });
        const order = this.orders.find(o => String(o.id) === String(id));
        if (order) {
          order.tracking_number = trackingNumber;
          order.courier = courier;
          order.status = 'Shipped';
        }
      } catch (error) {
        console.error('Failed to update tracking:', error);
        throw error;
      }
    },

    // ─── Inventory Invoice Actions ───────────────────────────────────────────────
    async fetchInventoryInvoices() {
      try {
        const response = await api.get('/inventory/invoices');
        this.inventoryInvoices = response.data.items || [];
      } catch (error) {
        console.error('Failed to fetch inventory invoices:', error);
        this.inventoryInvoices = [];
      }
    },
    async fetchInvoiceDetail(invoiceId) {
      this.loading = true;
      try {
        const response = await api.get(`/inventory/invoice/${invoiceId}`);
        return response.data; // Returns { summary, items, lastEvaluatedKey }
      } catch (error) {
        console.error('Failed to fetch invoice details:', error);
        return null;
      } finally {
        this.loading = false;
      }
    },
    async addInventoryInvoice(invoice) {
       this.loading = true;
       try {
          const response = await api.post('/inventory/add', invoice);
          // Refresh list to get the updated summary
          this.fetchInventoryInvoices();
          this.fetchInventoryReport();
          return response.data;
        } catch (error) {
         console.error('Failed to add invoice:', error);
         throw error;
       } finally {
         this.loading = false;
       }
    },
    async updateInventoryInvoice(id, invoice) {
       this.loading = true;
       try {
          const response = await api.put(`/products/admin/inventory/invoices/${id}`, invoice);
          const index = this.inventoryInvoices.findIndex(inv => String(inv.id || inv.PK) === String(id));
          if (index !== -1) this.inventoryInvoices[index] = response.data;
          this.fetchProducts(); 
          this.fetchInventoryReport();
          return response.data;
        } catch (error) {
         console.error('Failed to update invoice:', error);
         throw error;
       } finally {
         this.loading = false;
       }
    },
    async updateInventoryStatus(invoiceId, status) {
       this.loading = true;
       try {
          const response = await api.patch(`/inventory/invoice/${invoiceId}/status`, { status });
          // Update the local list
          const index = this.inventoryInvoices.findIndex(inv => 
            (inv.invoice_number === invoiceId) || (inv.invoiceNumber === invoiceId)
          );
          if (index !== -1) {
            this.inventoryInvoices[index] = { ...this.inventoryInvoices[index], status };
          }
          return response.data;
        } catch (error) {
         console.error('Failed to update status:', error);
         throw error;
       } finally {
         this.loading = false;
       }
    },
    async updateInventoryItemStatus(invoiceId, inventoryId, status) {
       this.loading = true;
       try {
          const response = await api.patch(`/inventory/invoice/${invoiceId}/item/${inventoryId}/status`, { status });
          // Update the local list
          const index = this.inventoryReport.records.findIndex(r => r.inventory_id === inventoryId);
          if (index !== -1) {
            this.inventoryReport.records[index] = { ...this.inventoryReport.records[index], status };
          }
          return response.data;
        } catch (error) {
         console.error('Failed to update item status:', error);
         throw error;
       } finally {
         this.loading = false;
       }
    },
    async bulkUpdateInventoryStatus(updates) {
       this.loading = true;
       try {
          const response = await api.patch('/inventory/bulk-status', { updates });
          // Update the local list (Immediate UI feedback)
          updates.forEach(u => {
            const index = this.inventoryReport.records.findIndex(r => r.inventory_id === u.inventoryId);
            if (index !== -1) {
              this.inventoryReport.records[index] = { ...this.inventoryReport.records[index], status: u.status };
            }
          });
          
          return response.data;
        } catch (error) {
         console.error('Failed to update bulk status:', error);
         throw error;
       } finally {
         this.loading = false;
       }
    },

    async fetchDashboardStats() {
      try {
        const response = await api.get('/admin/dashboard/stats');
        this.dashboardStats = response.data;
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      }
    },
    async fetchInventoryReport(filters = {}, append = false) {
      this.loading = true;
      try {
        let url = '/inventory/items?limit=50';
        
        // Add pagination key if appending
        if (append && this.inventoryLastKey) {
          url += `&lastKey=${encodeURIComponent(this.inventoryLastKey)}`;
        }

        // Add filters to query string
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'All') {
            url += `&${key}=${encodeURIComponent(value)}`;
          }
        });

        const response = await api.get(url);
        const newRecords = response.data.items || [];
        this.inventoryLastKey = response.data.lastEvaluatedKey || null;

        if (append) {
          this.inventoryReport.records.push(...newRecords);
        } else {
          this.inventoryReport.records = newRecords;
        }
        
        this.inventoryReport.summary = { 
          totalSKUs: this.inventoryReport.records.length,
          hasMore: !!this.inventoryLastKey
        };
      } catch (error) {
        console.error('Failed to fetch inventory report:', error);
        if (!append) {
          this.inventoryReport = { summary: {}, records: [] };
          this.inventoryLastKey = null;
        }
      } finally {
        this.loading = false;
      }
    },
    async fetchActiveInventoryItems(query = '') {
      try {
        const response = await api.get(`/inventory/active-items?q=${encodeURIComponent(query)}&limit=10`);
        return response.data.items || [];
      } catch (error) {
        console.error('Failed to fetch linkable inventory:', error);
        return [];
      }
    },
    // ─── Financial Actions (Real API) ────────────────────────────────────────────
    async fetchVendors() {
      try {
        const response = await api.get('/admin/vendors');
        this.vendors = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Failed to fetch vendors:', error);
        this.vendors = [];
      }
    },
    async registerVendor(vendor) {
      try {
        const response = await api.post('/admin/vendors', vendor);
        this.vendors.unshift(response.data);
        // Refresh financial snapshots if initial balance was provided
        if (vendor.initialBalance > 0) {
          this.fetchLedger();
          this.fetchVendorHistory(response.data.vendorId);
          this.fetchDailySummary(new Date().toISOString().split('T')[0]);
        }
        return response.data;
      } catch (error) {
        console.error('Failed to register vendor:', error);
        throw error;
      }
    },
    async fetchVendorHistory(vendorId) {
      try {
        const response = await api.get(`/admin/vendors/${vendorId}/transactions`);
        const data = Array.isArray(response.data) ? response.data : [];
        this.vendorTransactions = [...this.vendorTransactions.filter(t => String(t.vendorId) !== String(vendorId)), ...data];
      } catch (error) {
        console.error('Failed to fetch vendor history:', error);
      }
    },
    async payVendorSettlement(vendorId, amount, note = '') {
      try {
        const response = await api.post(`/admin/vendors/${vendorId}/transactions`, {
          date: Date.now(),
          type: 'Payment',
          amount,
          description: note || 'Institutional Account Settlement'
        });
        this.vendorTransactions.unshift(response.data);
        this.fetchLedger();
        this.fetchDailySummary(new Date().toISOString().split('T')[0]);
        this.fetchDashboardStats();
      } catch (error) {
        console.error('Failed settlement:', error);
        throw error;
      }
    },
    async addVendorBill(vendorId, amount, description) {
      try {
        const response = await api.post(`/admin/vendors/${vendorId}/transactions`, {
          date: Date.now(),
          type: 'Bill',
          amount,
          description
        });
        this.vendorTransactions.unshift(response.data);
        this.fetchLedger();
        this.fetchDailySummary(new Date().toISOString().split('T')[0]);
        this.fetchDashboardStats();
        return response.data;
      } catch (error) {
        console.error('Failed to record bill:', error);
        throw error;
      }
    },
    async fetchExpenses() {
      this.loading = true;
      try {
        const response = await api.get('/admin/expenses');
        const { data } = response;
        this.expenses = (Array.isArray(data) ? data : []).map(e => ({
          ...e,
          id: e.expenseId || e.id || e.PK?.split('#')[1],
          amount: Number(e.amount || 0)
        })).sort((a, b) => (b.date || 0) - (a.date || 0));
      } catch (error) {
        console.error('Failed to fetch expenses:', error);
        this.expenses = [];
        this.error = 'Financial activity endpoint unreachable.';
      } finally {
        this.loading = false;
      }
    },
    async addExpense(expense) {
      try {
        const response = await api.post('/admin/expenses', expense);
        const newRecord = {
          ...response.data,
          id: response.data.expenseId || response.data.id || response.data.PK?.split('#')[1],
          amount: Number(response.data.amount || 0)
        };
        this.expenses.unshift(newRecord);
        // Refresh financial snapshots
        this.fetchLedger();
        this.fetchDailySummary(new Date().toISOString().split('T')[0]);
        this.fetchDashboardStats();
        return newRecord;
      } catch (error) {
        console.error('Failed to add expense:', error);
        throw error;
      }
    },
    async fetchDailySummary(date) {
      this.loading = true;
      try {
        const response = await api.get(`/admin/ledger/daily/${date}`);
        return response.data || { grossRevenue: 0, totalExpenses: 0, netProfit: 0, transactions: [] };
      } catch (error) {
        console.error('Failed daily summary:', error);
        return { grossRevenue: 0, totalExpenses: 0, netProfit: 0, transactions: [] };
      } finally {
        this.loading = false;
      }
    },
    async fetchLedger() {
      this.loading = true;
      try {
        const response = await api.get('/admin/ledger');
        const mappedData = (Array.isArray(response.data) ? response.data : []).map(l => ({
          ...l,
          amount: Number(l.amount || 0)
        }));
        // Explicit Sort: Ensure newest record (highest date timestamp) is first
        this.ledger = mappedData.sort((a, b) => (b.date || 0) - (a.date || 0));
      } catch (error) {
        console.error('Failed to fetch ledger:', error);
        this.ledger = [];
      } finally {
        this.loading = false;
      }
    },
    async addLedgerEntry(entry) {
      this.loading = true;
      try {
        const response = await api.post('/admin/ledger', {
          ...entry,
          date: entry.date ? new Date(entry.date).getTime() : Date.now()
        });
        this.ledger.unshift(response.data);
        return response.data;
      } catch (error) {
        console.error('Failed to add manual adjustment:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async fetchDashboardAnalytics(period = 'Monthly') {
      try {
        const [revRes, topRes] = await Promise.all([
          api.get(`/admin/dashboard/revenue-chart?period=${period}`),
          api.get('/admin/dashboard/top-products')
        ]);
        this.revenueChart = revRes.data || [];
        this.topProducts = topRes.data || [];
      } catch (error) {
        console.error('Failed to fetch dashboard analytics:', error);
      }
    },

    // ─── Staff & Operations Actions ──────────────────────────────────────────────
    async fetchEmployees() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/employees');
        this.employees = Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Failed to fetch employees:', error);
        this.employees = [];
        this.error = 'Human Resources connection timeout.';
      } finally {
        this.loading = false;
      }
    },
    async addEmployee(employee) {
      try {
        const response = await api.post('/admin/employees', employee);
        this.employees.unshift(response.data);
        return response.data;
      } catch (error) {
        console.error('Failed add employee:', error);
        throw error;
      }
    },
    async markAttendance(data) {
      try {
        const response = await api.post('/admin/attendance', data);
        const idx = this.attendance.findIndex(a => a.employeeId === data.employeeId && a.date === data.date);
        if (idx !== -1) this.attendance[idx] = response.data;
        else this.attendance.push(response.data);
      } catch (error) {
        console.error('Failed mark attendance:', error);
      }
    },
    async processPayroll(payrollData) {
      this.loading = true;
      try {
        const response = await api.post('/admin/payroll', payrollData);
        this.payroll.unshift(response.data);
        this.fetchDailySummary(new Date().toISOString().split('T')[0]);
        return response.data;
      } catch (error) {
        console.error('Failed payroll:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // ─── CMS Actions ─────────────────────────────────────────────────────────────
    async fetchCms() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/cms/public'); // Using public for consistency or keep /admin/cms
        const data = response.data || {};
        
        // Merge with existing structure
        this.siteContent = { 
          ...this.siteContent,
          ...data,
          home: { 
            ...this.siteContent.home, 
            ...(data.home || {}),
            carousel: (data.home?.carousel || []).map(slide => {
              // Migration Logic: if slide has button1/button2 but no buttons array
              if (!slide.buttons && (slide.button1 || slide.button2)) {
                const buttons = [];
                if (slide.button1?.text) buttons.push({ ...slide.button1, bg: '#000000', textColor: '#ffffff', border: false });
                if (slide.button2?.text) buttons.push({ ...slide.button2, bg: '#ffffff', textColor: '#000000', border: true });
                return { ...slide, buttons, align: slide.align || 'middle-left' };
              }
              // Ensure all existing buttons have styling defaults
              if (slide.buttons) {
                slide.buttons = slide.buttons.map(b => ({
                  bg: '#000000',
                  textColor: '#ffffff',
                  border: false,
                  ...b
                }));
              }
              return { buttons: [], align: 'middle-left', ...slide };
            }),
            categories: (data.home?.categories && data.home.categories.length === 3) 
              ? data.home.categories 
              : [
                  { title: "Men's Collection", link: '/shop?gender=Men', image: '' },
                  { title: "Women's Collection", link: '/shop?gender=Women', image: '' },
                  { title: "Kids' Collection", link: '/shop?gender=Kids', image: '' }
                ],
            trustFeatures: (data.home?.trustFeatures && data.home.trustFeatures.length === 3)
              ? data.home.trustFeatures
              : [
                  { icon: 'Truck', title: 'Free Shipping', subtitle: 'On all orders above $100' },
                  { icon: 'RotateCcw', title: '30 Days Return', subtitle: 'No questions asked policy' },
                  { icon: 'ShieldCheck', title: 'Secure Payments', subtitle: '100% secure encrypted checkout' }
                ],
            videoBlock: {
              title: {
                text: typeof data.home?.videoBlock?.title === 'object' ? (data.home.videoBlock.title?.text ?? 'Move With Explosive Confidence.') : (data.home?.videoBlock?.title || 'Move With Explosive Confidence.'),
                size: data.home?.videoBlock?.title?.size || 48,
                color: data.home?.videoBlock?.title?.color || '#000000',
                bold: data.home?.videoBlock?.title?.bold !== undefined ? data.home?.videoBlock?.title?.bold : true,
                italic: data.home?.videoBlock?.title?.italic !== undefined ? data.home?.videoBlock?.title?.italic : true
              },
              description: {
                text: typeof data.home?.videoBlock?.description === 'object' ? (data.home.videoBlock.description?.text ?? 'We source only the finest fabrics...') : (data.home?.videoBlock?.description || 'We source only the finest fabrics...'),
                size: data.home?.videoBlock?.description?.size || 16,
                color: data.home?.videoBlock?.description?.color || '#64748b',
                bold: data.home?.videoBlock?.description?.bold || false,
                italic: data.home?.videoBlock?.description?.italic || false
              },
              perks: data.home?.videoBlock?.perks || ['Breathable Organic Cottons', '30-Day Limitless Returns', 'Lightning Fast Delivery'],
              perkStyle: {
                size: data.home?.videoBlock?.perkStyle?.size || 10,
                color: data.home?.videoBlock?.perkStyle?.color || '#000000',
                bold: data.home?.videoBlock?.perkStyle?.bold !== undefined ? data.home?.videoBlock?.perkStyle?.bold : true
              },
              videoUrl: data.home?.videoBlock?.videoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-fashion-model-posing-in-a-studio-setting-34444-large.mp4'
            },
            vipBanner: {
              title: {
                text: typeof data.home?.vipBanner?.title === 'object' ? (data.home.vipBanner.title?.text ?? 'Unlock The VIP Experience') : (data.home?.vipBanner?.title || 'Unlock The VIP Experience'),
                size: data.home?.vipBanner?.title?.size || 32,
                color: data.home?.vipBanner?.title?.color || '#ffffff',
                bold: data.home?.vipBanner?.title?.bold !== undefined ? data.home?.vipBanner?.title?.bold : true
              },
              description: {
                text: typeof data.home?.vipBanner?.description === 'object' ? (data.home.vipBanner.description?.text ?? 'Join the Dynamite Club today...') : (data.home?.vipBanner?.description || 'Join the Dynamite Club today...'),
                size: data.home?.vipBanner?.description?.size || 14,
                color: data.home?.vipBanner?.description?.color || '#ffffff'
              },
              bg: data.home?.vipBanner?.bg || '#4f46e5',
              buttonText: data.home?.vipBanner?.buttonText || 'Become a Member',
              link: data.home?.vipBanner?.link || '/login'
            }
          },
          process: {
            hero: {
              image: data.process?.hero?.image || 'https://images.unsplash.com/photo-1563823293806-03f140026e6d?q=80&w=2000&auto=format&fit=crop',
              title: {
                text: typeof data.process?.hero?.title === 'object' ? (data.process.hero.title?.text ?? 'OUR PROCESS & CRAFTSMANSHIP') : (data.process?.hero?.title || 'OUR PROCESS & CRAFTSMANSHIP'),
                size: data.process?.hero?.title?.size || 64,
                color: data.process?.hero?.title?.color || '#ffffff',
                bold: data.process?.hero?.title?.bold !== undefined ? data.process?.hero?.title?.bold : true,
                italic: data.process?.hero?.title?.italic !== undefined ? data.process?.hero?.title?.italic : true
              },
              subtitle: {
                text: typeof data.process?.hero?.subtitle === 'object' ? (data.process.hero.subtitle?.text ?? 'Take a look behind the curtain.') : (data.process?.hero?.subtitle || 'Take a look behind the curtain.'),
                size: data.process?.hero?.subtitle?.size || 20,
                color: data.process?.hero?.subtitle?.color || '#ffffff',
                bold: data.process?.hero?.subtitle?.bold || false,
                italic: data.process?.hero?.subtitle?.italic || false
              }
            },
            steps: (data.process?.steps || [
              { title: 'Source Finest Fabrics', have: 'Premium Pima Cotton', do: 'Iterative QC Testing' },
              { title: 'Precision Cutting', have: 'Digital Patterns', do: 'Laser Guided Slicing' }
            ]).map(s => ({
              title: {
                text: typeof s.title === 'object' ? (s.title?.text ?? 'New Milestone') : (s.title || 'New Milestone'),
                size: s.title?.size || 32,
                color: s.title?.color || '#111111',
                bold: s.title?.bold !== undefined ? s.title?.bold : true,
                italic: s.title?.italic || false
              },
              have: {
                text: typeof s.have === 'object' ? (s.have?.text ?? 'Elements we possess...') : (s.have || 'Elements we possess...'),
                size: s.have?.size || 14,
                color: s.have?.color || '#555555',
                bold: s.have?.bold || false,
                italic: s.have?.italic || false
              },
              do: {
                text: typeof s.do === 'object' ? (s.do?.text ?? 'Expert execution...') : (s.do || 'Expert execution...'),
                size: s.do?.size || 14,
                color: s.do?.color || '#555555',
                bold: s.do?.bold || false,
                italic: s.do?.italic || false
              }
            })),
            cta: {
              title: {
                text: typeof data.process?.cta?.title === 'object' ? (data.process.cta.title?.text ?? 'Experience The Difference') : (data.process?.cta?.title || 'Experience The Difference'),
                size: data.process?.cta?.title?.size || 42,
                color: data.process?.cta?.title?.color || '#111111',
                bold: data.process?.cta?.title?.bold !== undefined ? data.process?.cta?.title?.bold : true,
                italic: data.process?.cta?.title?.italic || false
              },
              subtitle: {
                text: typeof data.process?.cta?.subtitle === 'object' ? (data.process.cta.subtitle?.text ?? "Feel the craftsmanship.") : (data.process?.cta?.subtitle || "Feel the craftsmanship."),
                size: data.process?.cta?.subtitle?.size || 18,
                color: data.process?.cta?.subtitle?.color || '#666666',
                bold: data.process?.cta?.subtitle?.bold || false,
                italic: data.process?.cta?.subtitle?.italic || false
              }
            }
          },
          contact: {
            title: data.contact?.title || 'Contact Us',
            subtitle: data.contact?.subtitle || "We'd love to hear from you.",
            direct: {
              phone: data.contact?.direct?.phone || [],
              email: data.contact?.direct?.email || 'support@weardynamite.com'
            },
            mapUrl: data.contact?.mapUrl || ''
          },
          policies: {
            shippingAndReturns: {
              pageTitle: data.policies?.shippingAndReturns?.pageTitle || 'Shipping & Returns',
              shippingProcess: {
                title: data.policies?.shippingAndReturns?.shippingProcess?.title || 'Shipping Process',
                content: data.policies?.shippingAndReturns?.shippingProcess?.content || (typeof data.policies?.shipping === 'string' ? data.policies.shipping : '')
              },
              refundPolicy: {
                title: data.policies?.shippingAndReturns?.refundPolicy?.title || 'Refund Policy',
                content: data.policies?.shippingAndReturns?.refundPolicy?.content || ''
              }
            },
            faq: {
              pageTitle: data.policies?.faq?.pageTitle || 'Frequently Asked Questions',
              items: Array.isArray(data.policies?.faq?.items) ? data.policies.faq.items : (Array.isArray(data.policies?.faq) ? data.policies.faq : [])
            },
            privacy: {
              pageTitle: data.policies?.privacy?.pageTitle || 'Privacy Policy',
              content: data.policies?.privacy?.content || (typeof data.policies?.privacy === 'string' ? data.policies.privacy : '')
            },
            terms: {
              pageTitle: data.policies?.terms?.pageTitle || 'Terms of Service',
              subtitle: data.policies?.terms?.subtitle || '',
              lastUpdated: data.policies?.terms?.lastUpdated || '',
              items: Array.isArray(data.policies?.terms?.items) 
                ? data.policies.terms.items 
                : (typeof data.policies?.terms?.content === 'string' 
                  ? [{ title: 'Main Terms', content: data.policies.terms.content }] 
                  : (typeof data.policies?.terms === 'string' ? [{ title: 'Main Terms', content: data.policies.terms }] : []))
            }
          }
        };
      } catch (error) {
        console.error('Failed to fetch CMS:', error);
        this.error = 'Website architecture sync failed.';
      } finally {
        this.loading = false;
      }
    },
    async updateCmsSection(sectionPath, data) {
      try {
        const response = await api.put(`/admin/cms/${sectionPath.replace(/\./g, '/')}`, data);
        
        // Dynamic update of local state using dot notation path
        const parts = sectionPath.split('.');
        let target = this.siteContent;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) target[parts[i]] = {};
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = data;
        
        this.showNotification('Success', 'Website architecture updated live.', 'success');
        return response.data;
      } catch (error) {
        console.error(`Failed to update CMS ${sectionPath}:`, error);
        this.showNotification('Error', 'Failed to synchronize architecture.', 'error');
        throw error;
      }
    },

    // ─── Inbox & Marketing Actions ───────────────────────────────────────────────
    async fetchInquiries() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/admin/inquiries');
        this.inquiries = response.data.items || response.data || [];
      } catch (error) {
        console.error('Failed to fetch inquiries:', error);
        this.inquiries = [];
        this.error = 'Customer outreach system offline.';
      } finally {
        this.loading = false;
      }
    },
    async updateInquiryStatus(id, status) {
       try {
         await api.patch(`/admin/inquiries/${id}/status`, { status });
         const idx = this.inquiries.findIndex(i => String(i.id || i.inquiryId) === String(id));
         if (idx !== -1) this.inquiries[idx].status = status;
       } catch (error) {
         console.error('Failed update inquiry:', error);
       }
    },
    async fetchSubscribers() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/subscriptions/admin/subscribers');
        this.subscribers = response.data.items || response.data || [];
      } catch (error) {
        console.error('Failed fetch subscribers:', error);
        this.subscribers = [];
        this.error = 'Subscriber database unreachable.';
      } finally {
        this.loading = false;
      }
    },

    // ─── UI Helper Actions ───────────────────────────────────────────────────────
    openImagePreview(images, index = 0) {
      if (!images || !images.length) return
      const rawImages = typeof images === 'string' ? [images] : images
      this.imagePreview.images = rawImages.map(img => this.resolveImageUrl(img))
      this.imagePreview.currentIndex = index
      this.imagePreview.show = true
    },
    closeImagePreview() {
      this.imagePreview.show = false
    },
    nextPreview() {
      if (this.imagePreview.currentIndex < this.imagePreview.images.length - 1) {
        this.imagePreview.currentIndex++
      } else {
        this.imagePreview.currentIndex = 0
      }
    },
    removeFaq(index) {
      if (this.siteContent.policies.faq.items.length > 1) {
        this.siteContent.policies.faq.items.splice(index, 1);
      }
    },
    addTermsSection() {
      if (!this.siteContent.policies.terms.items) this.siteContent.policies.terms.items = [];
      this.siteContent.policies.terms.items.push({ title: 'New Section', content: '' });
    },
    removeTermsSection(index) {
      this.siteContent.policies.terms.items.splice(index, 1);
    },
    prevPreview() {
      if (this.imagePreview.currentIndex > 0) {
        this.imagePreview.currentIndex--
      } else {
        this.imagePreview.currentIndex = this.imagePreview.images.length - 1
      }
    },
    showNotification(title, message, type = 'info') {
      this.notification = {
        show: true,
        title: title || (type === 'error' ? 'Operational Alert' : 'System Message'),
        message,
        type
      }
      // Auto-hide success messages after 5s, leave errors for manual dismissal
      if (type === 'success') {
        setTimeout(() => this.closeNotification(), 5000)
      }
    },
    closeNotification() {
      this.notification.show = false
    }
  }
})

export type Locale = "es" | "en";

export type TranslationKey =
  // Header
  | "shop"
  | "myOrders"
  | "admin"
  | "cart"
  | "signIn"
  | "signOut"
  | "myProfile"
  | "adminPanel"
  | "accountMenu"

  // Footer
  | "quickLinks"
  | "shopAll"
  | "pickupHours"
  | "orderOnlinePickup"
  | "allRightsReserved"

  // Home
  | "searchProducts"
  | "featuredProducts"
  | "allProducts"
  | "resultsFor"
  | "noProductsFound"
  | "browseAllProducts"

  // Cart
  | "yourCartIsEmpty"
  | "browseProductsAddToCart"
  | "startShopping"
  | "shoppingCart"
  | "clearCart"
  | "clearCartConfirm"
  | "proceedToCheckout"
  | "item"
  | "items"
  | "each"
  | "decreaseQuantity"
  | "increaseQuantity"
  | "removeItem"

  // Checkout
  | "contactInformation"
  | "signedInAs"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "orderNotes"
  | "orderNotesPlaceholder"
  | "placeOrder"
  | "processing"
  | "bankTransfer"
  | "payViaBankTransfer"
  | "uploadReceipt"
  | "uploadReceiptOptional"
  | "chooseFile"
  | "remove"
  | "uploadLaterHint"
  | "emailCannotBeChanged"

  // Order Summary
  | "orderSummary"
  | "subtotal"
  | "tax"
  | "total"
  | "taxEstimated"
  | "taxNote"
  | "orderSummaryItemCount"

  // Orders List
  | "myOrdersHeading"
  | "noOrdersYet"
  | "orderNumber"
  | "orderDate"

  // Order Detail
  | "orderDetails"
  | "orderInformation"
  | "customerName"
  | "paymentMethod"
  | "orderNotesHeading"
  | "orderItems"
  | "updateReceipt"
  | "uploadReceiptButton"
  | "updateReceiptButton"
  | "receiptRejected"
  | "rejectionReason"
  | "uploadReceiptPrompt"
  | "receiptUploadedAwaiting"
  | "paymentReceipt"
  | "cancelOrder"
  | "cancelling"
  | "cancelConfirm"
  | "backToMyOrders"

  // Search
  | "searchResultsFor"
  | "searchProductsHeading"
  | "searching"
  | "productsFound"
  | "productFound"
  | "noSearchResults"

  // Product
  | "sale"
  | "outOfStock"
  | "onlyXLeft"
  | "addToCart"
  | "addedToCart"

  // Hero Banner
  | "heroTitle"
  | "heroSubtitle1"
  | "heroSubtitle2"
  | "heroDescription"
  | "shopNow"
  | "schedulePickup"

  // Currency display
  | "localCurrency"
  | "usdEquivalent";

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  es: {
    // Header
    shop: "Tienda",
    myOrders: "Mis Pedidos",
    admin: "Admin",
    cart: "Carrito",
    signIn: "Iniciar Sesión",
    signOut: "Cerrar Sesión",
    myProfile: "Mi Perfil",
    adminPanel: "Panel de Admin",
    accountMenu: "Menú de cuenta",

    // Footer
    quickLinks: "Enlaces Rápidos",
    shopAll: "Todos los Productos",
    pickupHours: "Horario de Recogida",
    orderOnlinePickup: "Ordene en línea y recoja a su conveniencia. Sin gastos de envío, sin esperas.",
    allRightsReserved: "Todos los derechos reservados.",

    // Home
    searchProducts: "Buscar productos...",
    featuredProducts: "Productos Destacados",
    allProducts: "Todos los Productos",
    resultsFor: 'Resultados para "{query}"',
    noProductsFound: "No se encontraron productos. Intente con otra búsqueda o categoría.",
    browseAllProducts: "Ver Todos los Productos",

    // Cart
    yourCartIsEmpty: "Tu carrito está vacío",
    browseProductsAddToCart: "Explore nuestros productos y añada artículos a su carrito.",
    startShopping: "Comenzar a Comprar",
    shoppingCart: "Carrito de Compras",
    clearCart: "Vaciar Carrito",
    clearCartConfirm: "¿Vaciar todos los artículos del carrito?",
    proceedToCheckout: "Ir al Pago",
    item: "artículo",
    items: "artículos",
    each: "c/u",
    decreaseQuantity: "Disminuir cantidad",
    increaseQuantity: "Aumentar cantidad",
    removeItem: "Eliminar artículo",

    // Checkout
    contactInformation: "Información de Contacto",
    signedInAs: "✓ Conectado como {name}",
    firstName: "Nombre *",
    lastName: "Apellido *",
    email: "Correo Electrónico *",
    phone: "Teléfono *",
    orderNotes: "Notas del Pedido (opcional)",
    orderNotesPlaceholder: "Instrucciones especiales para su pedido...",
    placeOrder: "Realizar Pedido",
    processing: "Procesando...",
    bankTransfer: "Transferencia Bancaria",
    payViaBankTransfer: "Pague mediante transferencia bancaria. Suba su comprobante de pago después de realizar el pedido.",
    uploadReceipt: "Subir Comprobante de Pago",
    uploadReceiptOptional: "Subir comprobante de pago (opcional ahora, requerido después)",
    chooseFile: "Elegir Archivo",
    remove: "Eliminar",
    uploadLaterHint: "También puede subir el comprobante más tarde desde la página del pedido.",
    emailCannotBeChanged: "El correo no se puede cambiar al estar conectado.",

    // Order Summary
    orderSummary: "Resumen del Pedido",
    subtotal: "Subtotal",
    tax: "Impuesto",
    total: "Total",
    taxEstimated: "Impuesto (estimado)",
    taxNote: "El impuesto se calcula al finalizar. El monto final puede variar.",
    orderSummaryItemCount: "Subtotal ({count} {items})",

    // Orders List
    myOrdersHeading: "Mis Pedidos",
    noOrdersYet: "Aún no hay pedidos.",
    orderNumber: "Número de Pedido",
    orderDate: "Fecha del Pedido",

    // Order Detail
    orderDetails: "Detalles del Pedido",
    orderInformation: "Información del Pedido",
    customerName: "Nombre del Cliente",
    paymentMethod: "Método de Pago",
    orderNotesHeading: "Notas del Pedido",
    orderItems: "Artículos del Pedido",
    updateReceipt: "Actualizar Comprobante de Pago",
    uploadReceiptButton: "Subir Comprobante",
    updateReceiptButton: "Actualizar Comprobante",
    receiptRejected: "Comprobante Rechazado",
    rejectionReason: "Motivo del rechazo: {reason}",
    uploadReceiptPrompt: "Por favor, suba un comprobante de pago válido.",
    receiptUploadedAwaiting: "Comprobante subido — esperando confirmación del administrador.",
    paymentReceipt: "Comprobante de Pago",
    cancelOrder: "Cancelar Pedido",
    cancelling: "Cancelando...",
    cancelConfirm: "¿Está seguro de que desea cancelar este pedido?",
    backToMyOrders: "Volver a Mis Pedidos",

    // Search
    searchResultsFor: 'Resultados de búsqueda para "{query}"',
    searchProductsHeading: "Buscar Productos",
    searching: "Buscando...",
    productsFound: "{count} productos encontrados",
    productFound: "{count} producto encontrado",
    noSearchResults: "No se encontraron productos que coincidan con su búsqueda.",

    // Product Card
    sale: "OFERTA",
    outOfStock: "Agotado",
    onlyXLeft: "Solo {count} restantes",
    addToCart: "Añadir al Carrito",
    addedToCart: "¡{product} añadido al carrito!",

    // Hero Banner
    heroTitle: "Productos Frescos,",
    heroSubtitle1: "Listos para Recoger",
    heroSubtitle2: "",
    heroDescription: "Explore nuestra selección, ordene en línea y recoja a su conveniencia. Sin gastos de envío, sin esperas.",
    shopNow: "Comprar Ahora",
    schedulePickup: "Agendar Recogida",

    // Currency display
    localCurrency: "Moneda Local",
    usdEquivalent: "Equivalente en USD",
  },

  en: {
    // Header
    shop: "Shop",
    myOrders: "My Orders",
    admin: "Admin",
    cart: "Cart",
    signIn: "Sign In",
    signOut: "Sign Out",
    myProfile: "My Profile",
    adminPanel: "Admin Panel",
    accountMenu: "Account menu",

    // Footer
    quickLinks: "Quick Links",
    shopAll: "Shop All",
    pickupHours: "Pickup Hours",
    orderOnlinePickup: "Order online and pick up at your convenience. No shipping fees, no waiting.",
    allRightsReserved: "All rights reserved.",

    // Home
    searchProducts: "Search products...",
    featuredProducts: "Featured Products",
    allProducts: "All Products",
    resultsFor: 'Results for "{query}"',
    noProductsFound: "No products found. Try a different search or category.",
    browseAllProducts: "Browse All Products",

    // Cart
    yourCartIsEmpty: "Your cart is empty",
    browseProductsAddToCart: "Browse our products and add items to your cart.",
    startShopping: "Start Shopping",
    shoppingCart: "Shopping Cart",
    clearCart: "Clear Cart",
    clearCartConfirm: "Clear all items from cart?",
    proceedToCheckout: "Proceed to Checkout",
    item: "item",
    items: "items",
    each: "each",
    decreaseQuantity: "Decrease quantity",
    increaseQuantity: "Increase quantity",
    removeItem: "Remove item",

    // Checkout
    contactInformation: "Contact Information",
    signedInAs: "✓ Signed in as {name}",
    firstName: "First Name *",
    lastName: "Last Name *",
    email: "Email *",
    phone: "Phone *",
    orderNotes: "Order Notes (optional)",
    orderNotesPlaceholder: "Any special instructions for your order...",
    placeOrder: "Place Order",
    processing: "Processing...",
    bankTransfer: "Bank Transfer",
    payViaBankTransfer: "Pay via bank transfer. Please upload your payment receipt after placing the order.",
    uploadReceipt: "Upload Payment Receipt",
    uploadReceiptOptional: "Upload Payment Receipt (optional now, required later)",
    chooseFile: "Choose File",
    remove: "Remove",
    uploadLaterHint: "You can also upload the receipt later from the order detail page.",
    emailCannotBeChanged: "Email cannot be changed when signed in.",

    // Order Summary
    orderSummary: "Order Summary",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total",
    taxEstimated: "Tax (estimated)",
    taxNote: "Tax is calculated at checkout. Final amount may vary.",
    orderSummaryItemCount: "Subtotal ({count} {items})",

    // Orders List
    myOrdersHeading: "My Orders",
    noOrdersYet: "No orders yet.",
    orderNumber: "Order Number",
    orderDate: "Order Date",

    // Order Detail
    orderDetails: "Order Details",
    orderInformation: "Order Information",
    customerName: "Customer Name",
    paymentMethod: "Payment Method",
    orderNotesHeading: "Order Notes",
    orderItems: "Order Items",
    updateReceipt: "Update Payment Receipt",
    uploadReceiptButton: "Upload Receipt",
    updateReceiptButton: "Update Receipt",
    receiptRejected: "Receipt Rejected",
    rejectionReason: "Rejection reason: {reason}",
    uploadReceiptPrompt: "Please upload a valid payment receipt.",
    receiptUploadedAwaiting: "Receipt uploaded — awaiting admin confirmation.",
    paymentReceipt: "Payment Receipt",
    cancelOrder: "Cancel Order",
    cancelling: "Cancelling...",
    cancelConfirm: "Are you sure you want to cancel this order?",
    backToMyOrders: "Back to My Orders",

    // Search
    searchResultsFor: 'Search results for "{query}"',
    searchProductsHeading: "Search Products",
    searching: "Searching...",
    productsFound: "{count} products found",
    productFound: "{count} product found",
    noSearchResults: "No products found matching your search.",

    // Product Card
    sale: "SALE",
    outOfStock: "Out of Stock",
    onlyXLeft: "Only {count} left",
    addToCart: "Add to Cart",
    addedToCart: "{product} added to cart!",

    // Hero Banner
    heroTitle: "Fresh Products,",
    heroSubtitle1: "Ready for Pickup",
    heroSubtitle2: "",
    heroDescription: "Browse our selection, order online, and pick up at your convenience. No shipping fees, no waiting.",
    shopNow: "Shop Now",
    schedulePickup: "Schedule Pickup",

    // Currency display
    localCurrency: "Local Currency",
    usdEquivalent: "USD Equivalent",
  },
};

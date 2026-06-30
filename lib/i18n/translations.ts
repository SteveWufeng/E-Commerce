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

  // General
  | "loading"

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
  | "mercantilPayment"
  | "payViaMercantil"
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

  // Admin
  | "dashboard"
  | "products"
  | "categories"
  | "orders"
  | "settings"
  | "storeInformation"
  | "taxSettings"
  | "currencySettings"
  | "notifications"
  | "paymentMethods"
  | "totalRevenue"
  | "totalOrders"
  | "avgOrderValue"
  | "topProducts"
  | "ordersByStatus"
  | "recentOrders"
  | "noSalesData"
  | "noOrdersYet2"
  | "orderHash"
  | "status"
  | "date"
  | "addProduct"
  | "searchProductsPlaceholder"
  | "noProductsMatch"
  | "noProductsYetAdd"
  | "editProduct"
  | "addNewProduct"
  | "productName"
  | "description"
  | "price"
  | "stock"
  | "salePrice"
  | "saveChanges"
  | "creating"
  | "cancel"
  | "active"
  | "inactive"
  | "actions"
  | "confirmDeleteProduct"
  | "delete"
  | "viewStorefront"
  | "adminPanelTitle"
  | "sold"
  | "onSale"
  | "notOnSale"
  | "categoryName"
  | "slug"
  | "addCategory"
  | "deleteCategoryConfirm"
  | "noCategories"
  | "allStatuses"
  | "confirmOrder"
  | "pickupReady"
  | "pickedUp"
  | "reject"
  | "restore"
  | "orderDetail"
  | "totalLabel"
  | "customerEmail"
  | "rejectionReasonLabel"
  | "receiptImage"
  | "noReceipt"
  | "cancelRejection"
  | "close"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"
  | "pickupHoursSettings"

  // Auth
  | "signInHeading"
  | "signInSubtitle"
  | "emailVerified"
  | "signingIn"
  | "signInWithGoogle"
  | "orSignInWithEmail"
  | "emailLabel"
  | "emailPlaceholder"
  | "passwordLabel"
  | "dontHaveAccount"
  | "signUpLink"
  | "continueAsGuest"
  | "authRequired"
  | "unauthorized"
  | "invalidCredentials"
  | "invalidVerificationLink"
  | "checkYourEmail"
  | "verificationSent"
  | "verificationInstructions"
  | "goToSignIn"
  | "createAccount"
  | "createAccountSubtitle"
  | "firstNameLabel"
  | "lastNameLabel"
  | "phoneOptional"
  | "confirmPasswordLabel"
  | "creatingAccount"
  | "alreadyHaveAccount"
  | "signInLink"
  | "passwordsDoNotMatch"
  | "passwordTooShort"
  | "signupFailed"
  | "unexpectedError"
  | "paymentNoticeTitle"
  | "paymentNoticeDescription"
  | "paymentNoticeAction"

  // Currency display
  | "localCurrency"
  | "usdEquivalent"

  // Barcode Scanner
  | "barcode"
  | "scanBarcode"
  | "scanning"
  | "scanProduct"
  | "scanMode"
  | "scannerMode"
  | "barcodeScanner"
  | "manualEntry"
  | "scanFailed"
  | "scanSuccess"
  | "addStock"
  | "removeStock"
  | "viewEdit"
  | "setPrice"
  | "scanHistory"
  | "stockAdjustment"
  | "adjustStock"
  | "productFound"
  | "productNotFound"
  | "startScanning"
  | "stopScanning"
  | "pointCameraAtBarcode"
  | "scanComplete"
  | "bulkOperations";

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
    loading: "Cargando...",
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
    mercantilPayment: "Botón de Pago Mercantil",
    payViaMercantil: "Pague con Mercantil Banco — débito inmediato, tarjetas o pagos móviles C2P.",
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

    // Admin
    dashboard: "Panel de Control",
    products: "Productos",
    categories: "Categorías",
    orders: "Pedidos",
    settings: "Configuración",
    storeInformation: "Información de la Tienda",
    taxSettings: "Configuración de Impuestos",
    currencySettings: "Configuración de Moneda",
    notifications: "Notificaciones",
    paymentMethods: "Métodos de Pago",
    totalRevenue: "Ingresos Totales",
    totalOrders: "Pedidos Totales",
    avgOrderValue: "Valor Promedio",
    topProducts: "Productos Más Vendidos",
    ordersByStatus: "Pedidos por Estado",
    recentOrders: "Pedidos Recientes",
    noSalesData: "Sin ventas aún.",
    noOrdersYet2: "Sin pedidos aún.",
    orderHash: "Pedido #",
    status: "Estado",
    date: "Fecha",
    addProduct: "Añadir Producto",
    searchProductsPlaceholder: "Buscar productos...",
    noProductsMatch: "Ningún producto coincide con su búsqueda.",
    noProductsYetAdd: "Aún no hay productos. ¡Añada su primer producto!",
    editProduct: "Editar Producto",
    addNewProduct: "Añadir Nuevo Producto",
    productName: "Nombre del Producto",
    description: "Descripción",
    price: "Precio",
    stock: "Stock",
    salePrice: "Precio de Oferta ($)",
    saveChanges: "Guardar Cambios",
    creating: "Creando...",
    cancel: "Cancelar",
    active: "Activo",
    inactive: "Inactivo",
    actions: "Acciones",
    confirmDeleteProduct: "¿Está seguro de que desea eliminar este producto?",
    delete: "Eliminar",
    viewStorefront: "Ver Tienda",
    adminPanelTitle: "Panel de Admin",
    sold: "vendidos",
    onSale: "OFERTA",
    notOnSale: "—",
    categoryName: "Nombre",
    slug: "Slug",
    addCategory: "Añadir Categoría",
    deleteCategoryConfirm: "¿Eliminar esta categoría? Los productos en esta categoría deberán reasignarse.",
    noCategories: "Aún no hay categorías.",
    allStatuses: "Todos los Estados",
    confirmOrder: "Confirmar",
    pickupReady: "Listo para Recoger",
    pickedUp: "Recogido",
    reject: "Rechazar",
    restore: "Restaurar",
    orderDetail: "Detalle del Pedido",
    totalLabel: "Total",
    customerEmail: "Correo",
    rejectionReasonLabel: "Motivo del Rechazo",
    receiptImage: "Comprobante",
    noReceipt: "Sin comprobante",
    cancelRejection: "Cancelar Rechazo",
    close: "Cerrar",
    // Pickup Hours
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
    pickupHoursSettings: "Horario de Recogida",

    // Auth
    signInHeading: "Iniciar Sesión",
    signInSubtitle: "¡Bienvenido de nuevo! Inicie sesión en su cuenta.",
    emailVerified: "¡Correo verificado! Ahora puede iniciar sesión.",
    signingIn: "Entrando...",
    signInWithGoogle: "Iniciar sesión con Google",
    orSignInWithEmail: "o inicie sesión con correo electrónico",
    emailLabel: "Correo Electrónico",
    emailPlaceholder: "usted@ejemplo.com",
    passwordLabel: "Contraseña",
    dontHaveAccount: "¿No tiene una cuenta?",
    signUpLink: "Registrarse",
    continueAsGuest: "Continuar como invitado",
    authRequired: "Debe iniciar sesión para acceder a esa página.",
    unauthorized: "No tiene permiso para acceder a esa página.",
    invalidCredentials: "Correo o contraseña inválidos.",
    invalidVerificationLink: "Enlace de verificación inválido.",
    checkYourEmail: "Revise su Correo",
    verificationSent: "Enviamos un enlace de verificación a",
    verificationInstructions: "Haga clic en el enlace para activar su cuenta, luego inicie sesión.",
    goToSignIn: "Ir a Iniciar Sesión",
    createAccount: "Crear Cuenta",
    createAccountSubtitle: "Regístrese para una experiencia de pago más rápida.",
    firstNameLabel: "Nombre",
    lastNameLabel: "Apellido",
    phoneOptional: "Teléfono (opcional)",
    confirmPasswordLabel: "Confirmar Contraseña",
    creatingAccount: "Creando cuenta...",
    alreadyHaveAccount: "¿Ya tiene una cuenta?",
    signInLink: "Iniciar Sesión",
    passwordsDoNotMatch: "Las contraseñas no coinciden.",
    passwordTooShort: "La contraseña debe tener al menos 6 caracteres.",
    signupFailed: "Error al registrarse.",
    unexpectedError: "Ocurrió un error inesperado.",
    paymentNoticeTitle: "⏳ Pago Pendiente",
    paymentNoticeDescription: "Su pedido NO se procesará hasta que realice el pago mediante transferencia bancaria y suba el comprobante de pago.",
    paymentNoticeAction: "Use el botón de abajo para subir el comprobante de su transferencia.",

    // Currency display
    localCurrency: "Moneda Local",
    usdEquivalent: "Equivalente en USD",

    // Barcode Scanner
    barcode: "Código de Barras",
    scanBarcode: "Escanear Código",
    scanning: "Escaneando...",
    scanProduct: "Escanear Producto",
    scanMode: "Modo Escáner",
    scannerMode: "Modo Escáner",
    barcodeScanner: "Escáner de Código de Barras",
    manualEntry: "Entrada Manual",
    scanFailed: "Error al escanear",
    scanSuccess: "Escaneo exitoso",
    addStock: "Agregar Stock",
    removeStock: "Quitar Stock",
    viewEdit: "Ver/Editar",
    setPrice: "Fijar Precio",
    scanHistory: "Historial de Escaneo",
    stockAdjustment: "Ajuste de Stock",
    adjustStock: "Ajustar Stock",
    productFound: "Producto encontrado",
    productNotFound: "Producto no encontrado",
    startScanning: "Iniciar Escáner",
    stopScanning: "Detener Escáner",
    pointCameraAtBarcode: "Apunte la cámara hacia un código de barras",
    scanComplete: "Escaneo completado",
    bulkOperations: "Operaciones Masivas",
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
    loading: "Loading...",
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
    mercantilPayment: "Mercantil Payment Button",
    payViaMercantil: "Pay with Mercantil Banco — debit, credit cards, or mobile payments (C2P).",
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

    // Admin
    dashboard: "Dashboard",
    products: "Products",
    categories: "Categories",
    orders: "Orders",
    settings: "Settings",
    storeInformation: "Store Information",
    taxSettings: "Tax Settings",
    currencySettings: "Currency Settings",
    notifications: "Notifications",
    paymentMethods: "Payment Methods",
    totalRevenue: "Total Revenue",
    totalOrders: "Total Orders",
    avgOrderValue: "Avg Order Value",
    topProducts: "Top Products",
    ordersByStatus: "Orders by Status",
    recentOrders: "Recent Orders",
    noSalesData: "No sales data yet.",
    noOrdersYet2: "No orders yet.",
    orderHash: "Order #",
    status: "Status",
    date: "Date",
    addProduct: "Add Product",
    searchProductsPlaceholder: "Search products...",
    noProductsMatch: "No products match your search.",
    noProductsYetAdd: "No products yet. Add your first product!",
    editProduct: "Edit Product",
    addNewProduct: "Add New Product",
    productName: "Product Name",
    description: "Description",
    price: "Price",
    stock: "Stock",
    salePrice: "Sale Price ($)",
    saveChanges: "Save Changes",
    creating: "Creating...",
    cancel: "Cancel",
    active: "Active",
    inactive: "Inactive",
    actions: "Actions",
    confirmDeleteProduct: "Are you sure you want to delete this product?",
    delete: "Delete",
    viewStorefront: "View Storefront",
    adminPanelTitle: "Admin Panel",
    sold: "sold",
    onSale: "SALE",
    notOnSale: "—",
    categoryName: "Name",
    slug: "Slug",
    addCategory: "Add Category",
    deleteCategoryConfirm: "Delete this category? Products in this category will need reassignment.",
    noCategories: "No categories yet.",
    allStatuses: "All Statuses",
    confirmOrder: "Confirm",
    pickupReady: "Ready for Pickup",
    pickedUp: "Picked Up",
    reject: "Reject",
    restore: "Restore",
    orderDetail: "Order Detail",
    totalLabel: "Total",
    customerEmail: "Email",
    rejectionReasonLabel: "Rejection Reason",
    receiptImage: "Receipt",
    noReceipt: "No receipt",
    cancelRejection: "Cancel Rejection",
    close: "Close",
    // Pickup Hours
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    pickupHoursSettings: "Pickup Hours",

    // Auth
    signInHeading: "Sign In",
    signInSubtitle: "Welcome back! Sign in to your account.",
    emailVerified: "Email verified! You can now sign in.",
    signingIn: "Signing in...",
    signInWithGoogle: "Sign in with Google",
    orSignInWithEmail: "or sign in with email",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    passwordLabel: "Password",
    dontHaveAccount: "Don't have an account?",
    signUpLink: "Sign up",
    continueAsGuest: "Continue as guest",
    authRequired: "Please sign in to access that page.",
    unauthorized: "You do not have permission to access that page.",
    invalidCredentials: "Invalid email or password.",
    invalidVerificationLink: "Invalid verification link.",
    checkYourEmail: "Check Your Email",
    verificationSent: "We sent a verification link to",
    verificationInstructions: "Click the link to activate your account, then sign in.",
    goToSignIn: "Go to Sign In",
    createAccount: "Create Account",
    createAccountSubtitle: "Join us for a faster checkout experience.",
    firstNameLabel: "First Name",
    lastNameLabel: "Last Name",
    phoneOptional: "Phone (optional)",
    confirmPasswordLabel: "Confirm Password",
    creatingAccount: "Creating account...",
    alreadyHaveAccount: "Already have an account?",
    signInLink: "Sign in",
    passwordsDoNotMatch: "Passwords do not match.",
    passwordTooShort: "Password must be at least 6 characters.",
    signupFailed: "Signup failed.",
    unexpectedError: "An unexpected error occurred.",
    paymentNoticeTitle: "⏳ Payment Pending",
    paymentNoticeDescription: "Your order will NOT be processed until you complete the bank transfer and upload the payment receipt.",
    paymentNoticeAction: "Use the button below to upload your transfer receipt.",

    // Currency display
    localCurrency: "Local Currency",
    usdEquivalent: "USD Equivalent",

    // Barcode Scanner
    barcode: "Barcode",
    scanBarcode: "Scan Barcode",
    scanning: "Scanning...",
    scanProduct: "Scan Product",
    scanMode: "Scan Mode",
    scannerMode: "Scanner Mode",
    barcodeScanner: "Barcode Scanner",
    manualEntry: "Manual Entry",
    scanFailed: "Scan failed",
    scanSuccess: "Scan successful",
    addStock: "Add Stock",
    removeStock: "Remove Stock",
    viewEdit: "View/Edit",
    setPrice: "Set Price",
    scanHistory: "Scan History",
    stockAdjustment: "Stock Adjustment",
    adjustStock: "Adjust Stock",
    productFound: "Product found",
    productNotFound: "Product not found",
    startScanning: "Start Scanner",
    stopScanning: "Stop Scanner",
    pointCameraAtBarcode: "Point camera at a barcode",
    scanComplete: "Scan complete",
    bulkOperations: "Bulk Operations",
  },
};

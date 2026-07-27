/**
 * pages.config.jsx - Page routing configuration (LAZY LOADED)
 * 
 * Todos os imports de página usam React.lazy() para code-splitting.
 * O Layout e RequireRole permanecem estáticos (necessários no carregamento inicial).
 */
import React from 'react';
import { RequireRole } from '@/components/common';
import __Layout from './Layout.jsx';

const AcessoVendedor = React.lazy(() => import('./pages/AcessoVendedor'));
const ActivePartners = React.lazy(() => import('./pages/ActivePartners'));
const AddCatalogProduct = React.lazy(() => import('./pages/AddCatalogProduct'));
const AnaliseDeLotes = React.lazy(() => import('./pages/AnaliseDeLotes'));
const AddFunds = React.lazy(() => import('./pages/AddFunds'));
const AdminCatalogSales = React.lazy(() => import('./pages/AdminCatalogSales'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminWithdrawals = React.lazy(() => import('./pages/AdminWithdrawals'));
const AmbienteDeTeste = React.lazy(() => import('./pages/AmbienteDeTeste'));
const ArquitetoIA = React.lazy(() => import('./pages/ArquitetoIA'));
const AuctionCheckoutModern = React.lazy(() => import('./pages/AuctionCheckoutModern'));
const AuctionControl = React.lazy(() => import('./pages/AuctionControl'));
const AuctionDetails = React.lazy(() => import('./pages/AuctionDetails'));
const AuctionRoom = React.lazy(() => import('./pages/AuctionRoom'));
const AuditSnapshot = React.lazy(() => import('./pages/AuditSnapshot'));
const BannerManagement = React.lazy(() => import('./pages/BannerManagement'));
const PainelMidia = React.lazy(() => import('./pages/PainelMidia'));
const CadastroInvestidor = React.lazy(() => import('./pages/CadastroInvestidor'));
const CadastroLeiloeiro = React.lazy(() => import('./pages/CadastroLeiloeiro'));
const CarteiraInvestidor = React.lazy(() => import('./pages/CarteiraInvestidor'));
const CRM = React.lazy(() => import('./pages/CRM'));
const CRMInvestidores = React.lazy(() => import('./pages/CRMInvestidores'));
const CareerLevelsReport = React.lazy(() => import('./pages/CareerLevelsReport'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Catalog = React.lazy(() => import('./pages/Catalog'));
const CatalogCheckout2 = React.lazy(() => import('./pages/CatalogCheckout2'));
const CatalogManagement = React.lazy(() => import('./pages/CatalogManagement'));
const CatalogOrderTracking = React.lazy(() => import('./pages/CatalogOrderTracking'));
const CatalogProductDetails = React.lazy(() => import('./pages/CatalogProductDetails'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const CommissionDistributionFull = React.lazy(() => import('./pages/CommissionDistributionFull'));
const CommissionPilot = React.lazy(() => import('./pages/CommissionPilot'));
const CreateAuction = React.lazy(() => import('./pages/CreateAuction'));
const CreateAuctionV2 = React.lazy(() => import('./pages/CreateAuctionV2'));
const CreateCatalogProduct = React.lazy(() => import('./pages/CreateCatalogProduct'));
const CreateLuxuryAuction = React.lazy(() => import('./pages/CreateLuxuryAuction'));
const CustomerDetails = React.lazy(() => import('./pages/CustomerDetails'));
const DailyReportView = React.lazy(() => import('./pages/DailyReportView'));
const DiretoDeFabrica = React.lazy(() => import('./pages/DiretoDeFabrica'));
const ArremateDevolucoes = React.lazy(() => import('./pages/ArremateDevolucoes'));
const SejaVendedor = React.lazy(() => import('./pages/SejaVendedor'));
const EditAuction = React.lazy(() => import('./pages/EditAuction'));
const EditCatalogProduct = React.lazy(() => import('./pages/EditCatalogProduct'));
const ErrorReport = React.lazy(() => import('./pages/ErrorReport'));
const Financial = React.lazy(() => import('./pages/Financial'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const Home = React.lazy(() => import('./pages/Home'));
const Influencers = React.lazy(() => import('./pages/Influencers'));
const InfluencersDashboard = React.lazy(() => import('./pages/InfluencersDashboard'));
const InvestorDashboard = React.lazy(() => import('./pages/InvestorDashboard'));
const Landing = React.lazy(() => import('./pages/Landing'));
const LicenseeOrders = React.lazy(() => import('./pages/LicenseeOrders'));
const Licensing = React.lazy(() => import('./pages/Licensing'));
const LicensorCRM = React.lazy(() => import('./pages/LicensorCRM'));
const LiveShop = React.lazy(() => import('./pages/LiveShop'));
const LiveShopControlNoZap = React.lazy(() => import('./pages/LiveShopControlNoZap'));
const LiveShopNoZap = React.lazy(() => import('./pages/LiveShopNoZap'));
const LojistaDashboard = React.lazy(() => import('./pages/LojistaDashboard'));
const LuxuryAccessManager = React.lazy(() => import('./pages/LuxuryAccessManager'));
const LuxuryBannerManagement = React.lazy(() => import('./pages/LuxuryBannerManagement'));
const LuxuryCollection = React.lazy(() => import('./pages/LuxuryCollection'));
const MarketplaceLotes = React.lazy(() => import('./pages/MarketplaceLotes'));
const MemoryBackup = React.lazy(() => import('./pages/MemoryBackup'));
const MyCatalogOrders = React.lazy(() => import('./pages/MyCatalogOrders'));
const MyWinnings = React.lazy(() => import('./pages/MyWinnings'));
const NetworkOverview = React.lazy(() => import('./pages/NetworkOverview'));
const OrderTracking = React.lazy(() => import('./pages/OrderTracking'));
const PartnerPlanActivation = React.lazy(() => import('./pages/PartnerPlanActivation'));
const Partners = React.lazy(() => import('./pages/Partners'));
const Portal = React.lazy(() => import('./pages/Portal'));
const SuperAdminPanels = React.lazy(() => import('./pages/SuperAdminPanels'));
const PaymentFailure = React.lazy(() => import('./pages/PaymentFailure'));
const PaymentSettings = React.lazy(() => import('./pages/PaymentSettings'));
const ProductManagement = React.lazy(() => import('./pages/ProductManagement'));
const ProductOperationHistory = React.lazy(() => import('./pages/ProductOperationHistory'));
const Profile = React.lazy(() => import('./pages/Profile'));
const PromoCreator = React.lazy(() => import('./pages/PromoCreator'));
const ProtecaoCriacao = React.lazy(() => import('./pages/ProtecaoCriacao'));
const ProtectionDashboard = React.lazy(() => import('./pages/ProtectionDashboard'));
const Register = React.lazy(() => import('./pages/Register'));
const RegisterBatches = React.lazy(() => import('./pages/RegisterBatches'));
const RegisterLicensee = React.lazy(() => import('./pages/RegisterLicensee'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const ShippingSettings = React.lazy(() => import('./pages/ShippingSettings'));
const StockPosition = React.lazy(() => import('./pages/StockPosition'));
const StoreRegistration = React.lazy(() => import('./pages/StoreRegistration'));
const StressTest = React.lazy(() => import('./pages/StressTest'));
const SystemChecklist = React.lazy(() => import('./pages/SystemChecklist'));
const SystemDiagnostics = React.lazy(() => import('./pages/SystemDiagnostics'));
const TesteLeilao = React.lazy(() => import('./pages/TesteLeilao'));
const TransactionHistory = React.lazy(() => import('./pages/TransactionHistory'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const WalletHistory = React.lazy(() => import('./pages/WalletHistory'));


export const PAGES = {
    "AcessoVendedor": AcessoVendedor,
    // 🔒 Carteira de parceiros (nomes, e-mails, CPFs, valores investidos) — só admin.
    "ActivePartners": () => (
        <RequireRole allowedRoles={['admin', 'super_admin']} fallbackRoute="Home">
            <ActivePartners />
        </RequireRole>
    ),
    "AddCatalogProduct": AddCatalogProduct,
    "AnaliseDeLotes": AnaliseDeLotes,
    "AddFunds": AddFunds,
    "AdminCatalogSales": AdminCatalogSales,
    "AdminUsers": AdminUsers,
    "AdminWithdrawals": AdminWithdrawals,
    "AmbienteDeTeste": AmbienteDeTeste,
    "ArquitetoIA": ArquitetoIA,
    "AuctionCheckoutModern": AuctionCheckoutModern,
    "AuctionControl": AuctionControl,
    "AuctionDetails": AuctionDetails,
    "AuctionRoom": AuctionRoom,
    "AuditSnapshot": AuditSnapshot,
    "BannerManagement": BannerManagement,
    // 🖼️ Painel de Mídia — banners por página, logo e favicon. Só admin.
    "PainelMidia": () => (
        <RequireRole allowedRoles={['admin', 'super_admin']} fallbackRoute="Home">
            <PainelMidia />
        </RequireRole>
    ),
    "CadastroInvestidor": CadastroInvestidor,
    "CadastroLeiloeiro": CadastroLeiloeiro,
    "CarteiraInvestidor": () => (
        <RequireRole allowedRoles={['admin', 'investidor']} fallbackRoute="Home">
            <CarteiraInvestidor />
        </RequireRole>
    ),
    "CRM": CRM,
    "CRMInvestidores": () => (
        <RequireRole allowedRoles={['admin', 'leiloeiro']} fallbackRoute="Home">
            <CRMInvestidores />
        </RequireRole>
    ),
    "CareerLevelsReport": CareerLevelsReport,
    "Cart": Cart,
    "Catalog": Catalog,
    "CatalogCheckout2": CatalogCheckout2,
    "CatalogManagement": CatalogManagement,
    "CatalogOrderTracking": CatalogOrderTracking,
    "CatalogProductDetails": CatalogProductDetails,
    "Checkout": Checkout,
    "CommissionDistributionFull": CommissionDistributionFull,
    "CommissionPilot": CommissionPilot,
    "CreateAuction": CreateAuction,
    "CreateAuctionV2": CreateAuctionV2,
    "CreateCatalogProduct": CreateCatalogProduct,
    "CreateLuxuryAuction": CreateLuxuryAuction,
    "CustomerDetails": CustomerDetails,
    "DailyReportView": DailyReportView,
    "DiretoDeFabrica": DiretoDeFabrica,
    "ArremateDevolucoes": ArremateDevolucoes,
    "SejaVendedor": SejaVendedor,
    "EditAuction": EditAuction,
    "EditCatalogProduct": EditCatalogProduct,
    "ErrorReport": ErrorReport,
    "Financial": Financial,
    "ForgotPassword": ForgotPassword,
    "Home": Home,
    "Influencers": Influencers,
    "InfluencersDashboard": InfluencersDashboard,
    "InvestorDashboard": InvestorDashboard,
    "Landing": Landing,
    "LicenseeOrders": LicenseeOrders,
    "Licensing": Licensing,
    "LicensorCRM": LicensorCRM,
    "LiveShop": LiveShop,
    "LiveShopControlNoZap": LiveShopControlNoZap,
    "LiveShopNoZap": LiveShopNoZap,
    "LojistaDashboard": LojistaDashboard,
    "LuxuryAccessManager": LuxuryAccessManager,
    "LuxuryBannerManagement": LuxuryBannerManagement,
    "LuxuryCollection": LuxuryCollection,
    "MarketplaceLotes": () => (
        <RequireRole allowedRoles={['admin', 'investidor']} fallbackRoute="Home">
            <MarketplaceLotes />
        </RequireRole>
    ),
    "MemoryBackup": MemoryBackup,
    "MyCatalogOrders": MyCatalogOrders,
    "MyWinnings": MyWinnings,
    "NetworkOverview": NetworkOverview,
    "OrderTracking": OrderTracking,
    // 🔒 Ativação de plano de parceiro (mexe em dinheiro/plano) — só admin.
    "PartnerPlanActivation": () => (
        <RequireRole allowedRoles={['admin', 'super_admin']} fallbackRoute="Home">
            <PartnerPlanActivation />
        </RequireRole>
    ),
    "Partners": Partners, // pública de propósito: é a landing "Seja um Parceiro"
    "Portal": Portal,
    "SuperAdminPanels": SuperAdminPanels,
    "PaymentFailure": PaymentFailure,
    "PaymentSettings": PaymentSettings,
    "ProductManagement": ProductManagement,
    "ProductOperationHistory": ProductOperationHistory,
    "Profile": Profile,
    "PromoCreator": PromoCreator,
    "ProtecaoCriacao": ProtecaoCriacao,
    "ProtectionDashboard": ProtectionDashboard,
    "Register": Register,
    "RegisterBatches": RegisterBatches,
    "RegisterLicensee": RegisterLicensee,
    "ResetPassword": ResetPassword,
    "ShippingSettings": ShippingSettings,
    "StockPosition": StockPosition,
    "StoreRegistration": StoreRegistration,
    "StressTest": StressTest,
    "SystemChecklist": SystemChecklist,
    "SystemDiagnostics": SystemDiagnostics,
    "TesteLeilao": TesteLeilao,
    "TransactionHistory": TransactionHistory,
    "UserManagement": UserManagement,
    "WalletHistory": WalletHistory,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
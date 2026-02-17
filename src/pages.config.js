/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ActivePartners from './pages/ActivePartners';
import AddCatalogProduct from './pages/AddCatalogProduct';
import AdminCatalogSales from './pages/AdminCatalogSales';
import AdminUsers from './pages/AdminUsers';
import AdminWithdrawals from './pages/AdminWithdrawals';
import AmbienteDeTeste from './pages/AmbienteDeTeste';
import ArquitetoIA from './pages/ArquitetoIA';
import AuctionControl from './pages/AuctionControl';
import AuctionDetails from './pages/AuctionDetails';
import AuctionRoom from './pages/AuctionRoom';
import AuditSnapshot from './pages/AuditSnapshot';
import BannerManagement from './pages/BannerManagement';
import CRM from './pages/CRM';
import CareerLevelsReport from './pages/CareerLevelsReport';
import Cart from './pages/Cart';
import Catalog from './pages/Catalog';
import CatalogCheckout from './pages/CatalogCheckout';
import CatalogCheckout2 from './pages/CatalogCheckout2';
import CatalogManagement from './pages/CatalogManagement';
import CatalogOrderTracking from './pages/CatalogOrderTracking';
import CatalogProductDetails from './pages/CatalogProductDetails';
import Checkout from './pages/Checkout';
import CommissionDistributionFull from './pages/CommissionDistributionFull';
import CreateAuction from './pages/CreateAuction';
import CreateAuctionV2 from './pages/CreateAuctionV2';
import CreateCatalogProduct from './pages/CreateCatalogProduct';
import CreateLuxuryAuction from './pages/CreateLuxuryAuction';
import CustomerDetails from './pages/CustomerDetails';
import DiretoDeFabrica from './pages/DiretoDeFabrica';
import EditAuction from './pages/EditAuction';
import EditCatalogProduct from './pages/EditCatalogProduct';
import ErrorReport from './pages/ErrorReport';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Influencers from './pages/Influencers';
import InfluencersDashboard from './pages/InfluencersDashboard';
import InvestorDashboard from './pages/InvestorDashboard';
import Landing from './pages/Landing';
import LicenseeOrders from './pages/LicenseeOrders';
import Licensing from './pages/Licensing';
import LicensorCRM from './pages/LicensorCRM';
import LiveShop from './pages/LiveShop';
import LiveShopControlNoZap from './pages/LiveShopControlNoZap';
import LiveShopNoZap from './pages/LiveShopNoZap';
import LojistaDashboard from './pages/LojistaDashboard';
import LuxuryAccessManager from './pages/LuxuryAccessManager';
import LuxuryBannerManagement from './pages/LuxuryBannerManagement';
import LuxuryCollection from './pages/LuxuryCollection';
import MemoryBackup from './pages/MemoryBackup';
import MyCatalogOrders from './pages/MyCatalogOrders';
import NetworkOverview from './pages/NetworkOverview';
import OrderTracking from './pages/OrderTracking';
import PDV from './pages/PDV';
import PartnerPlanActivation from './pages/PartnerPlanActivation';
import Partners from './pages/Partners';
import PaymentFailure from './pages/PaymentFailure';
import PaymentSettings from './pages/PaymentSettings';
import ProductManagement from './pages/ProductManagement';
import ProductOperationHistory from './pages/ProductOperationHistory';
import Profile from './pages/Profile';
import ProtecaoCriacao from './pages/ProtecaoCriacao';
import ProtectionDashboard from './pages/ProtectionDashboard';
import Register from './pages/Register';
import RegisterBatches from './pages/RegisterBatches';
import RegisterLicensee from './pages/RegisterLicensee';
import ResetPassword from './pages/ResetPassword';
import ShippingSettings from './pages/ShippingSettings';
import StockPosition from './pages/StockPosition';
import StoreRegistration from './pages/StoreRegistration';
import StressTest from './pages/StressTest';
import SystemChecklist from './pages/SystemChecklist';
import SystemDiagnostics from './pages/SystemDiagnostics';
import SystemTest from './pages/SystemTest';
import TesteLeilao from './pages/TesteLeilao';
import TransactionHistory from './pages/TransactionHistory';
import UserManagement from './pages/UserManagement';
import WalletHistory from './pages/WalletHistory';
import MyWinnings from './pages/MyWinnings';
import AddFunds from './pages/AddFunds';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ActivePartners": ActivePartners,
    "AddCatalogProduct": AddCatalogProduct,
    "AdminCatalogSales": AdminCatalogSales,
    "AdminUsers": AdminUsers,
    "AdminWithdrawals": AdminWithdrawals,
    "AmbienteDeTeste": AmbienteDeTeste,
    "ArquitetoIA": ArquitetoIA,
    "AuctionControl": AuctionControl,
    "AuctionDetails": AuctionDetails,
    "AuctionRoom": AuctionRoom,
    "AuditSnapshot": AuditSnapshot,
    "BannerManagement": BannerManagement,
    "CRM": CRM,
    "CareerLevelsReport": CareerLevelsReport,
    "Cart": Cart,
    "Catalog": Catalog,
    "CatalogCheckout": CatalogCheckout,
    "CatalogCheckout2": CatalogCheckout2,
    "CatalogManagement": CatalogManagement,
    "CatalogOrderTracking": CatalogOrderTracking,
    "CatalogProductDetails": CatalogProductDetails,
    "Checkout": Checkout,
    "CommissionDistributionFull": CommissionDistributionFull,
    "CreateAuction": CreateAuction,
    "CreateAuctionV2": CreateAuctionV2,
    "CreateCatalogProduct": CreateCatalogProduct,
    "CreateLuxuryAuction": CreateLuxuryAuction,
    "CustomerDetails": CustomerDetails,
    "DiretoDeFabrica": DiretoDeFabrica,
    "EditAuction": EditAuction,
    "EditCatalogProduct": EditCatalogProduct,
    "ErrorReport": ErrorReport,
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
    "MemoryBackup": MemoryBackup,
    "MyCatalogOrders": MyCatalogOrders,
    "NetworkOverview": NetworkOverview,
    "OrderTracking": OrderTracking,
    "PDV": PDV,
    "PartnerPlanActivation": PartnerPlanActivation,
    "Partners": Partners,
    "PaymentFailure": PaymentFailure,
    "PaymentSettings": PaymentSettings,
    "ProductManagement": ProductManagement,
    "ProductOperationHistory": ProductOperationHistory,
    "Profile": Profile,
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
    "SystemTest": SystemTest,
    "TesteLeilao": TesteLeilao,
    "TransactionHistory": TransactionHistory,
    "UserManagement": UserManagement,
    "WalletHistory": WalletHistory,
    "MyWinnings": MyWinnings,
    "AddFunds": AddFunds,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
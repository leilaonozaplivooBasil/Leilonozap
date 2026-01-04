import AdminUsers from './pages/AdminUsers';
import AdminWithdrawals from './pages/AdminWithdrawals';
import ArquitetoIA from './pages/ArquitetoIA';
import AuctionControl from './pages/AuctionControl';
import AuctionDetails from './pages/AuctionDetails';
import AuctionRoom from './pages/AuctionRoom';
import BannerManagement from './pages/BannerManagement';
import CRM from './pages/CRM';
import CreateAuctionSaiDeBaixo from './pages/CreateAuctionSaiDeBaixo';
import CustomerDetails from './pages/CustomerDetails';
import EditAuction from './pages/EditAuction';
import ErrorReport from './pages/ErrorReport';
import Home from './pages/Home';
import Influencers from './pages/Influencers';
import InfluencersDashboard from './pages/InfluencersDashboard';
import InvestorDashboard from './pages/InvestorDashboard';
import Landing from './pages/Landing';
import LandingSaiDeBaixo from './pages/LandingSaiDeBaixo';
import Licensing from './pages/Licensing';
import LicensorCRM from './pages/LicensorCRM';
import LiveShop from './pages/LiveShop';
import LiveShopControl from './pages/LiveShopControl';
import LiveShopControlNoZap from './pages/LiveShopControlNoZap';
import LiveShopNoZap from './pages/LiveShopNoZap';
import LojistaDashboard from './pages/LojistaDashboard';
import MemoryBackup from './pages/MemoryBackup';
import MyWinnings from './pages/MyWinnings';
import NetworkOverview from './pages/NetworkOverview';
import OrderTracking from './pages/OrderTracking';
import OrderTrackingSaiDeBaixo from './pages/OrderTrackingSaiDeBaixo';
import PDV from './pages/PDV';
import Partners from './pages/Partners';
import PaymentSettings from './pages/PaymentSettings';
import PlanCheckout from './pages/PlanCheckout';
import ProductManagement from './pages/ProductManagement';
import Profile from './pages/Profile';
import ProtecaoCriacao from './pages/ProtecaoCriacao';
import ProtectionDashboard from './pages/ProtectionDashboard';
import Register from './pages/Register';
import RegisterBatches from './pages/RegisterBatches';
import SaiDeBaixo from './pages/SaiDeBaixo';
import ShippingSettings from './pages/ShippingSettings';
import StockPosition from './pages/StockPosition';
import StoreRegistration from './pages/StoreRegistration';
import SystemChecklist from './pages/SystemChecklist';
import SystemDiagnostics from './pages/SystemDiagnostics';
import SystemTest from './pages/SystemTest';
import TesteLeilao from './pages/TesteLeilao';
import TransactionHistory from './pages/TransactionHistory';
import WalletDeposit from './pages/WalletDeposit';
import WalletHistory from './pages/WalletHistory';
import CreateAuction from './pages/CreateAuction';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminUsers": AdminUsers,
    "AdminWithdrawals": AdminWithdrawals,
    "ArquitetoIA": ArquitetoIA,
    "AuctionControl": AuctionControl,
    "AuctionDetails": AuctionDetails,
    "AuctionRoom": AuctionRoom,
    "BannerManagement": BannerManagement,
    "CRM": CRM,
    "CreateAuctionSaiDeBaixo": CreateAuctionSaiDeBaixo,
    "CustomerDetails": CustomerDetails,
    "EditAuction": EditAuction,
    "ErrorReport": ErrorReport,
    "Home": Home,
    "Influencers": Influencers,
    "InfluencersDashboard": InfluencersDashboard,
    "InvestorDashboard": InvestorDashboard,
    "Landing": Landing,
    "LandingSaiDeBaixo": LandingSaiDeBaixo,
    "Licensing": Licensing,
    "LicensorCRM": LicensorCRM,
    "LiveShop": LiveShop,
    "LiveShopControl": LiveShopControl,
    "LiveShopControlNoZap": LiveShopControlNoZap,
    "LiveShopNoZap": LiveShopNoZap,
    "LojistaDashboard": LojistaDashboard,
    "MemoryBackup": MemoryBackup,
    "MyWinnings": MyWinnings,
    "NetworkOverview": NetworkOverview,
    "OrderTracking": OrderTracking,
    "OrderTrackingSaiDeBaixo": OrderTrackingSaiDeBaixo,
    "PDV": PDV,
    "Partners": Partners,
    "PaymentSettings": PaymentSettings,
    "PlanCheckout": PlanCheckout,
    "ProductManagement": ProductManagement,
    "Profile": Profile,
    "ProtecaoCriacao": ProtecaoCriacao,
    "ProtectionDashboard": ProtectionDashboard,
    "Register": Register,
    "RegisterBatches": RegisterBatches,
    "SaiDeBaixo": SaiDeBaixo,
    "ShippingSettings": ShippingSettings,
    "StockPosition": StockPosition,
    "StoreRegistration": StoreRegistration,
    "SystemChecklist": SystemChecklist,
    "SystemDiagnostics": SystemDiagnostics,
    "SystemTest": SystemTest,
    "TesteLeilao": TesteLeilao,
    "TransactionHistory": TransactionHistory,
    "WalletDeposit": WalletDeposit,
    "WalletHistory": WalletHistory,
    "CreateAuction": CreateAuction,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
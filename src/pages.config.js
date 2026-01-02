import Home from './pages/Home';
import AuctionRoom from './pages/AuctionRoom';
import CreateAuction from './pages/CreateAuction';
import Ranking from './pages/Ranking';
import Profile from './pages/Profile';
import Landing from './pages/Landing';
import AuctionDetails from './pages/AuctionDetails';
import EditAuction from './pages/EditAuction';
import Licensing from './pages/Licensing';
import LicensorCRM from './pages/LicensorCRM';
import MemoryBackup from './pages/MemoryBackup';
import MyWinnings from './pages/MyWinnings';
import TesteLeilao from './pages/TesteLeilao';
import ErrorReport from './pages/ErrorReport';
import SystemTest from './pages/SystemTest';
import ProtecaoCriacao from './pages/ProtecaoCriacao';
import NetworkOverview from './pages/NetworkOverview';
import AdminUsers from './pages/AdminUsers';
import SystemDiagnostics from './pages/SystemDiagnostics';
import ProtectionDashboard from './pages/ProtectionDashboard';
import ProductManagement from './pages/ProductManagement';
import SaiDeBaixo from './pages/SaiDeBaixo';
import PaymentSettings from './pages/PaymentSettings';
import TransactionHistory from './pages/TransactionHistory';
import WalletDeposit from './pages/WalletDeposit';
import WalletHistory from './pages/WalletHistory';
import ShippingSettings from './pages/ShippingSettings';
import BannerManagement from './pages/BannerManagement';
import LiveShop from './pages/LiveShop';
import CreateAuctionSaiDeBaixo from './pages/CreateAuctionSaiDeBaixo';
import LandingSaiDeBaixo from './pages/LandingSaiDeBaixo';
import Influencers from './pages/Influencers';
import InfluencersDashboard from './pages/InfluencersDashboard';
import InfluencerRanking from './pages/InfluencerRanking';
import OrderTracking from './pages/OrderTracking';
import OrderTrackingSaiDeBaixo from './pages/OrderTrackingSaiDeBaixo';
import InfluencersNoZap from './pages/InfluencersNoZap';
import LiveShopControl from './pages/LiveShopControl';
import LiveShopNoZap from './pages/LiveShopNoZap';
import LiveShopControlNoZap from './pages/LiveShopControlNoZap';
import AuctionControl from './pages/AuctionControl';
import StoreRegistration from './pages/StoreRegistration';
import LojistaDashboard from './pages/LojistaDashboard';
import Register from './pages/Register';
import RegisterBatches from './pages/RegisterBatches';
import PDV from './pages/PDV';
import StockPosition from './pages/StockPosition';
import CRM from './pages/CRM';
import CustomerDetails from './pages/CustomerDetails';
import Partners from './pages/Partners';
import InvestorDashboard from './pages/InvestorDashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "AuctionRoom": AuctionRoom,
    "CreateAuction": CreateAuction,
    "Ranking": Ranking,
    "Profile": Profile,
    "Landing": Landing,
    "AuctionDetails": AuctionDetails,
    "EditAuction": EditAuction,
    "Licensing": Licensing,
    "LicensorCRM": LicensorCRM,
    "MemoryBackup": MemoryBackup,
    "MyWinnings": MyWinnings,
    "TesteLeilao": TesteLeilao,
    "ErrorReport": ErrorReport,
    "SystemTest": SystemTest,
    "ProtecaoCriacao": ProtecaoCriacao,
    "NetworkOverview": NetworkOverview,
    "AdminUsers": AdminUsers,
    "SystemDiagnostics": SystemDiagnostics,
    "ProtectionDashboard": ProtectionDashboard,
    "ProductManagement": ProductManagement,
    "SaiDeBaixo": SaiDeBaixo,
    "PaymentSettings": PaymentSettings,
    "TransactionHistory": TransactionHistory,
    "WalletDeposit": WalletDeposit,
    "WalletHistory": WalletHistory,
    "ShippingSettings": ShippingSettings,
    "BannerManagement": BannerManagement,
    "LiveShop": LiveShop,
    "CreateAuctionSaiDeBaixo": CreateAuctionSaiDeBaixo,
    "LandingSaiDeBaixo": LandingSaiDeBaixo,
    "Influencers": Influencers,
    "InfluencersDashboard": InfluencersDashboard,
    "InfluencerRanking": InfluencerRanking,
    "OrderTracking": OrderTracking,
    "OrderTrackingSaiDeBaixo": OrderTrackingSaiDeBaixo,
    "InfluencersNoZap": InfluencersNoZap,
    "LiveShopControl": LiveShopControl,
    "LiveShopNoZap": LiveShopNoZap,
    "LiveShopControlNoZap": LiveShopControlNoZap,
    "AuctionControl": AuctionControl,
    "StoreRegistration": StoreRegistration,
    "LojistaDashboard": LojistaDashboard,
    "Register": Register,
    "RegisterBatches": RegisterBatches,
    "PDV": PDV,
    "StockPosition": StockPosition,
    "CRM": CRM,
    "CustomerDetails": CustomerDetails,
    "Partners": Partners,
    "InvestorDashboard": InvestorDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
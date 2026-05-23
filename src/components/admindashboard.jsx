// admindashboard.jsx - Professional Modern Admin Dashboard (Fixed)
// Fully responsive with animations, glassmorphism, and interactive elements

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import {
  Layout,
  Menu,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Button,
  Card,
  DatePicker,
  Badge,
  Select,
  Tag,
  Row,
  Col,
  Space,
  Statistic,
  Alert,
  Dropdown,
  Avatar,
  Tooltip,
  Popconfirm,
  message,
  Divider,
  Descriptions,
  Spin,
  Typography,
  Progress,
  Empty,
  Upload,
  Slider,
  Grid,
  Drawer,
  ConfigProvider,
  FloatButton,
  Watermark,
  Timeline,
  Result,
  App
} from "antd";

const { TextArea } = Input;

import {
  DatabaseOutlined,
  SettingOutlined,
  DashboardOutlined,
  LogoutOutlined,
  TableOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  ReloadOutlined,
  LockOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  HistoryOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  SearchOutlined,
  UploadOutlined,
  DownloadOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  HomeOutlined,
  AppstoreOutlined,
  ToolOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  GlobalOutlined,
  CreditCardOutlined,
  WalletOutlined,
  PercentageOutlined,
  SaveOutlined,
  RollbackOutlined,
  FolderOpenOutlined,
  MenuOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  CrownOutlined
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Dragger } = Upload;
const { useBreakpoint } = Grid;

// ==================== Constants ====================
const API_BASE_URL = "https://pool-costing-api.intelithon.in";
const AUTH_TOKEN_KEY = "tenant_admin_token";
const USER_DATA_KEY = "tenant_admin_data";
const TENANT_INFO_KEY = "tenant_info";

// Master tables that have read-only fields from master data
const MASTER_TABLES = [
  'main_pool', 
  'balancetank', 
  'mep', 
  'jacuzzi_spa_mep_master', 
  'waterbody_mep_items',
  'pipes',
  'ball_valves',
  'puddle_flanges'
];

// Tables that support bulk discount application
const DISCOUNT_ENABLED_TABLES = [
  'main_pool',
  'balancetank', 
  'mep',
  'jacuzzi_spa_mep_master',
  'waterbody_mep_items',
  'mep_rates',
  'heat_pump',
  'pipes',
  'ball_valves',
  'puddle_flanges',
  'excavation_rates'
];

// Piping tables subset
const PIPING_TABLES = ['pipes', 'ball_valves', 'puddle_flanges'];

// Piping endpoints
const PIPING_ENDPOINTS = {
  pipes: '/admin/pipes',
  ball_valves: '/admin/ball-valves',
  puddle_flanges: '/admin/puddle-flanges',
};

// ==================== Animation Variants ====================
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

const scaleHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2 }
};

// ==================== API Helper ====================
const apiRequest = async (url, method = "GET", body = null) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("No authentication token found");

  const options = {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${url}`, options);
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(TENANT_INFO_KEY);
    window.location.href = "/admin";
    throw new Error("Session expired. Please login again.");
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
};

const apiRequestFormData = async (endpoint, formData, method = "POST") => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) throw new Error("No authentication token found");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: { "Authorization": `Bearer ${token}` },
    body: formData,
  });
  if (response.status === 401) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(TENANT_INFO_KEY);
    window.location.href = "/admin";
    throw new Error("Session expired. Please login again.");
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  return response.json();
};

// ==================== normalizeRow Helper ====================
const normalizeRow = (r) => {
  if (!r) return {};
  if (r.code !== undefined) {
    return {
      id: r.id,
      SlNo: r.id,
      Code: r.code,
      Description: r.description || "",
      Rate: parseFloat(r.rate || 0)
    };
  }
  const id = r.SlNo ?? r.id ?? null;
  let rate = 0;
  if (r.Rate !== undefined && r.Rate !== null) rate = parseFloat(r.Rate);
  else if (r.rate !== undefined && r.rate !== null) rate = parseFloat(r.rate);
  return {
    id: id,
    SlNo: r.SlNo || id,
    Description: r.Description || '',
    Unit: r.Unit || '',
    Dia: r.Dia ?? null,
    Code: r.Code || '',
    Rate: rate,
    Image: r.Image || '',
    tenant_data_id: r.tenant_data_id || null
  };
};

// ==================== Animated Statistic Card ====================
const AnimatedStatCard = ({ title, value, icon, color, prefix, onClick }) => {
  const screens = useBreakpoint();
  return (
    <motion.div
      variants={scaleHover}
      whileHover="whileHover"
      whileTap="whileTap"
      style={{ cursor: onClick ? "pointer" : "default", height: "100%" }}
      onClick={onClick}
    >
      <Card
        style={{
          borderRadius: "20px",
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}30`,
          height: "100%",
          overflow: "hidden",
          position: "relative"
        }}
        bodyStyle={{ padding: screens.md ? "24px" : "16px" }}
      >
        <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1 }}>
          {icon}
        </div>
        <Statistic
          title={<span style={{ color: color, fontWeight: 500 }}>{title}</span>}
          value={value}
          prefix={prefix || icon}
          valueStyle={{ 
            color: "#1a1a1a", 
            fontWeight: 600,
            fontSize: screens.md ? "32px" : "24px"
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{
            height: 3,
            background: `linear-gradient(90deg, ${color}, transparent)`,
            marginTop: 12,
            borderRadius: 3
          }}
        />
      </Card>
    </motion.div>
  );
};

// ==================== ReusableTable Component ====================
const ReusableTable = ({ data, columns, loading, selectedRowKeys, onSelectChange, rowKey, pagination, ...props }) => {
  const rowSelection = onSelectChange ? { 
    selectedRowKeys, 
    onChange: onSelectChange, 
    selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE] 
  } : undefined;
  
  return (
    <Table
      rowKey={rowKey}
      columns={columns}
      dataSource={data}
      loading={loading}
      rowSelection={rowSelection}
      pagination={pagination !== false ? { 
        pageSize: pagination?.pageSize || 10, 
        showSizeChanger: true, 
        showTotal: (total) => `${total} items` 
      } : false}
      bordered
      style={{ borderRadius: "16px", overflow: "hidden" }}
      {...props}
    />
  );
};

// ==================== AdminLayout Component ====================
const AdminLayout = ({ children, collapsed, onCollapse, user, onLogout, menuContent, companyData }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getLogoUrl = () => {
    if (companyData?.logo_url) {
      const normalizedPath = companyData.logo_url.replace(/\\/g, "/");
      return `${API_BASE_URL}/${normalizedPath}`;
    }
    return '';
  };

  const getCompanyName = () => companyData?.company_name || "Intelithon";

  if (isMobile) {
    return (
      <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
        <Drawer
          placement="left"
          closable={true}
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width={280}
          styles={{ body: { padding: 0, background: "#001529" } }}
        >
          <div style={{ padding: "24px 16px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <img src={getLogoUrl()} alt={getCompanyName()} width={60} style={{ borderRadius: "12px" }} />
            <Text style={{ color: "white", display: "block", marginTop: 12 }}>{getCompanyName()}</Text>
          </div>
          {menuContent}
        </Drawer>
        <Layout>
          <div style={{ 
            padding: "0 16px", 
            background: "#fff", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            height: "56px",
            borderBottom: "1px solid #f0f0f0"
          }}>
            <Button type="text" icon={<MenuOutlined />} onClick={() => setMobileMenuOpen(true)} />
            <motion.img 
              src={getLogoUrl()} 
              alt={getCompanyName()}
              height={32}
              whileHover={{ scale: 1.05 }}
              style={{ objectFit: "contain" }}
            />
            <Badge dot>
              <Button type="text" icon={<BellOutlined />} />
            </Badge>
          </div>
          {children}
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", overflow: "hidden" }}>
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
      >
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={onCollapse}
          theme="dark"
          width={280}
          trigger={null}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 1000,
            background: "linear-gradient(180deg, #001529 0%, #002140 100%)",
            boxShadow: "4px 0 20px rgba(0, 0, 0, 0.08)"
          }}
        >
          <motion.div 
            style={{ 
              padding: collapsed ? "24px 16px" : "24px 16px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: collapsed ? "center" : "flex-start",
              borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}
            whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <img 
              src={getLogoUrl()} 
              alt={getCompanyName()}
              width={collapsed ? 40 : 80}
              height={collapsed ? 40 : 80}
              style={{ borderRadius: "12px", objectFit: "contain" }}
              onError={(e) => { e.target.onerror = null; e.target.src = '/INt.png'; }}
            />
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ marginLeft: 12 }}
              >
                <Text style={{ color: "white", fontSize: "16px", fontWeight: 600 }}>{getCompanyName()}</Text>
                <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: "12px", display: "block" }}>Admin Portal</Text>
              </motion.div>
            )}
          </motion.div>
          {menuContent}
          {!collapsed && (
            <motion.div 
              style={{ 
                margin: "16px", 
                padding: "16px", 
                background: "rgba(255,255,255,0.05)", 
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.1)"
              }}
              whileHover={{ background: "rgba(255,255,255,0.08)" }}
            >
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <SafetyCertificateOutlined /> Secure Connection
              </Text>
              <Progress percent={100} size="small" showInfo={false} strokeColor="#52c41a" style={{ marginTop: 8 }} />
            </motion.div>
          )}
        </Sider>
      </motion.div>
      <Layout style={{ marginLeft: collapsed ? 80 : 280, transition: "all 0.2s ease" }}>
        {children}
      </Layout>
    </Layout>
  );
};

// ==================== HeaderBar Component ====================
const HeaderBar = ({ 
  user, onLogout, connectionStatus, onRefresh, effectiveDate, 
  isHistoricalView, isDateLocked, quotationId, onDateChange, 
  onExitQuotation, collapsed, onToggleCollapse 
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [notificationOpen, setNotificationOpen] = useState(false);

  const notifications = [
    { title: "System Update", description: "New features available", time: "2 min ago", type: "info" },
    { title: "Backup Complete", description: "Database backup successful", time: "1 hour ago", type: "success" },
    { title: "Rate Update", description: "MEP rates were updated", time: "3 hours ago", type: "warning" },
  ];

  const handleLogoutClick = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(TENANT_INFO_KEY);
    window.location.href = "/admin";
  };

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, type: "spring" }}
    >
      <Header style={{ 
        background: "#fff", 
        padding: isMobile ? "0 12px" : "0 24px", 
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        position: "sticky",
        top: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: isMobile ? "56px" : "70px",
        borderBottom: "1px solid #f0f0f0"
      }}>
        <Space align="center" size={isMobile ? "small" : "middle"}>
          {!screens.md && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={onToggleCollapse}
              style={{ fontSize: "18px" }}
            />
          )}
          
          <motion.div whileHover={{ scale: 1.02 }}>
            <DatePicker
              value={dayjs(effectiveDate)}
              onChange={(date) => onDateChange(date ? date.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"))}
              disabled={isDateLocked}
              format="DD/MM/YYYY"
              allowClear={false}
              suffixIcon={<CalendarOutlined />}
              size={isMobile ? "small" : "middle"}
              style={{ borderRadius: "12px" }}
            />
          </motion.div>
          
          {isHistoricalView && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <Badge
                count={
                  <Space size={4} style={{ padding: "0 10px", fontSize: isMobile ? "10px" : "12px" }}>
                    <HistoryOutlined /> Historical
                  </Space>
                }
                style={{ backgroundColor: "#faad14", color: "#fff", fontWeight: 600 }}
              />
            </motion.div>
          )}
          
          {isDateLocked && quotationId && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <Tag color="blue" icon={<LockOutlined />} style={{ borderRadius: "20px", padding: "4px 12px" }}>
                <Space size={4}>
                  <FileTextOutlined /> #{quotationId}
                  <Button type="text" size="small" icon={<CloseCircleOutlined />} onClick={onExitQuotation} style={{ marginLeft: 4 }} />
                </Space>
              </Tag>
            </motion.div>
          )}
        </Space>
        
        <Space size={isMobile ? "small" : "middle"} align="center">
          {!isMobile && (
            <motion.div whileHover={{ scale: 1.05 }}>
              <Tooltip title={connectionStatus === "connected" ? "Connected" : "Disconnected"}>
                <Badge
                  status={connectionStatus === "connected" ? "success" : "error"}
                  text={
                    <Space size={4}>
                      {connectionStatus === "connected" ? <CloudSyncOutlined /> : <CloseCircleOutlined />}
                      <span style={{ fontSize: "12px" }}>{connectionStatus === "connected" ? "Online" : "Offline"}</span>
                    </Space>
                  }
                />
              </Tooltip>
            </motion.div>
          )}
          
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Tooltip title="Refresh Data">
              <Button
                icon={<ReloadOutlined />}
                onClick={onRefresh}
                type="text"
                size={isMobile ? "small" : "middle"}
                style={{ borderRadius: "50%" }}
              />
            </Tooltip>
          </motion.div>
          
          <Dropdown
            menu={{
              items: notifications.map((n, i) => ({
                key: i,
                label: (
                  <div style={{ padding: "8px 12px", minWidth: 250 }}>
                    <Text strong>{n.title}</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 12 }}>{n.description}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{n.time}</Text>
                  </div>
                )
              }))
            }}
            placement="bottomRight"
            trigger={['click']}
            open={notificationOpen}
            onOpenChange={setNotificationOpen}
          >
            <Badge count={notifications.length} size="small">
              <Button type="text" icon={<BellOutlined />} style={{ borderRadius: "50%" }} />
            </Badge>
          </Dropdown>
          
          <Dropdown
            menu={{
              items: [
                { key: "profile", label: <Space><UserOutlined /> {user?.username || "Admin"}</Space>, disabled: true },
                { key: "role", label: <Space><CrownOutlined /> Administrator</Space>, disabled: true },
                { type: "divider" },
                { key: "settings", label: <Space><SettingOutlined /> Settings</Space> },
                { type: "divider" },
                { key: "logout", label: <Space><LogoutOutlined /> Logout</Space>, onClick: handleLogoutClick, danger: true },
              ],
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Space align="center" style={{ cursor: "pointer", padding: "6px 12px", borderRadius: "30px", background: "#f5f5f5" }}>
                <Avatar
                  icon={<UserOutlined />}
                  size={isMobile ? "small" : "default"}
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                />
                {!isMobile && <span style={{ fontWeight: 500 }}>{user?.username?.split('@')[0] || "Admin"}</span>}
              </Space>
            </motion.div>
          </Dropdown>
        </Space>
      </Header>
    </motion.div>
  );
};

// ==================== DescriptionSection Component ====================
const DescriptionSection = ({ title, content }) => {
  const screens = useBreakpoint();
  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" style={{ marginBottom: 24 }}>
      <div style={{ 
        background: "#fafafa", 
        padding: screens.md ? "24px" : "16px", 
        borderRadius: "20px" 
      }}>
        {title && <Title level={4}><InfoCircleOutlined style={{ color: "#667eea" }} /> {title}</Title>}
        <Text type="secondary">{content}</Text>
      </div>
    </motion.div>
  );
};

// ==================== AnimatedCard Component ====================
const AnimatedCard = ({ children, title, extra, ...props }) => (
  <motion.div
    variants={fadeIn}
    initial="initial"
    animate="animate"
    exit="exit"
    whileHover={{ y: -4 }}
    transition={{ duration: 0.3 }}
  >
    <Card
      {...props}
      title={title}
      extra={extra}
      style={{
        borderRadius: "20px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        border: "none",
        background: "#fff"
      }}
      bodyStyle={{ padding: "20px" }}
    >
      {children}
    </Card>
  </motion.div>
);

// ==================== BulkDiscountManager Component ====================
const BulkDiscountManager = ({ tableName, records, onApplyDiscount, isHistoricalView, isDateLocked, loading }) => {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const screens = useBreakpoint();

  const currentTotal = useMemo(() => records.reduce((sum, item) => sum + (item.Rate || 0), 0), [records]);
  const discountedTotal = currentTotal * (1 - discountPercent / 100);
  const discountAmount = currentTotal - discountedTotal;

  const handleApplyDiscount = () => {
    if (discountPercent === 0) return message.warning("Set discount > 0");
    setConfirmVisible(true);
  };

  const confirmApplyDiscount = async () => {
    await onApplyDiscount(discountPercent);
    setConfirmVisible(false);
    setDiscountPercent(0);
    message.success(`🎉 ${discountPercent}% discount applied successfully!`);
  };

  return (
    <>
      <AnimatedCard
        title={<Space><PercentageOutlined style={{ color: "#667eea" }} />Bulk Discount</Space>}
        extra={<Tag color="blue">{records.length} items</Tag>}
        style={{ marginBottom: 24, border: "2px solid #667eea", background: "linear-gradient(135deg, #667eea08 0%, #764ba208 100%)" }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Text strong>Discount: {discountPercent}%</Text>
            <Slider
              min={0}
              max={100}
              value={discountPercent}
              onChange={setDiscountPercent}
              disabled={isHistoricalView || isDateLocked || records.length === 0}
              trackStyle={{ background: "linear-gradient(90deg, #667eea, #764ba2)" }}
              handleStyle={{ borderColor: "#667eea" }}
            />
          </Col>
          <Col xs={24} md={8}>
            <div style={{ background: "#f5f5f5", padding: "12px", borderRadius: "12px" }}>
              <Row><Col span={12}>Current:</Col><Col span={12} style={{ textAlign: "right" }}>₹{currentTotal.toLocaleString()}</Col></Row>
              <Row><Col span={12}>Discount:</Col><Col span={12} style={{ textAlign: "right", color: "#ff4d4f" }}>-₹{discountAmount.toLocaleString()}</Col></Row>
              <Row><Col span={12}><strong>New Total:</strong></Col><Col span={12} style={{ textAlign: "right", color: "#52c41a" }}><strong>₹{discountedTotal.toLocaleString()}</strong></Col></Row>
            </div>
          </Col>
          <Col xs={24} md={6}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleApplyDiscount}
                disabled={isHistoricalView || isDateLocked || records.length === 0 || discountPercent === 0}
                loading={loading}
                block
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none", borderRadius: "12px", height: 48 }}
              >
                Apply {discountPercent}% Discount
              </Button>
            </motion.div>
          </Col>
        </Row>
      </AnimatedCard>

      <Modal
        title="Confirm Bulk Discount"
        open={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onOk={confirmApplyDiscount}
        okText="Apply Discount"
        okButtonProps={{ danger: true, icon: <SaveOutlined /> }}
        width={screens.md ? 600 : '95%'}
        centered
      >
        <Result
          status="warning"
          title={`Apply ${discountPercent}% discount to ${records.length} items?`}
          subTitle="This action cannot be undone."
        />
        <div style={{ background: "#f5f5f5", padding: 16, borderRadius: 12, marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}><Statistic title="Current" value={currentTotal} precision={2} prefix="₹" /></Col>
            <Col span={8}><Statistic title="Discount" value={discountAmount} precision={2} prefix="₹" valueStyle={{ color: '#cf1322' }} /></Col>
            <Col span={8}><Statistic title="New" value={discountedTotal} precision={2} prefix="₹" valueStyle={{ color: '#389e0d' }} /></Col>
          </Row>
        </div>
      </Modal>
    </>
  );
};

// ==================== DatabaseManager Component ====================
const DatabaseManager = ({ table, tables, tableSchema, records, loading, editingId, searchTerm, selectedRecords, isHistoricalView, isDateLocked, dashboardStats, onTableChange, onStartEdit, onSaveRecord, onDeleteRecord, onBulkDelete, onSearch, onSelectRecords, onExport, onCreateTable, onAddColumn, onDeleteColumn, onDeleteTable, onApplyBulkDiscount, bulkDiscountLoading }) => {
  const [form] = Form.useForm();
  const [newTableForm] = Form.useForm();
  const [newColumnForm] = Form.useForm();
  const [createTableModal, setCreateTableModal] = useState(false);
  const [addColumnModal, setAddColumnModal] = useState(false);
  const [deleteColumnModal, setDeleteColumnModal] = useState(false);
  const [deleteTableModal, setDeleteTableModal] = useState(false);
  const screens = useBreakpoint();

  const isPipingTable = PIPING_TABLES.includes(table);
  const hasDiaColumn = isPipingTable;

  const getColumnsForTable = useCallback(() => {
    if (table === "excavation_rates") {
      return [
        { title: 'ID', dataIndex: 'SlNo', key: 'SlNo', width: 70, fixed: 'left', align: 'center', render: (t) => <Tag color="purple">#{t}</Tag> },
        { title: 'CODE', dataIndex: 'Code', key: 'Code', width: 100, render: (t) => <Tag color="cyan">{t}</Tag> },
        { title: 'DESCRIPTION', dataIndex: 'Description', key: 'Description', ellipsis: true },
        { title: 'RATE (₹)', dataIndex: 'Rate', key: 'Rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
      ];
    }
    if (!tableSchema.columns) return [];
    const baseColumns = [
      { title: 'ID', dataIndex: 'SlNo', key: 'SlNo', width: 80, fixed: 'left', align: 'center', render: (t) => <Tag color="geekblue">#{t}</Tag> }
    ];
    if (MASTER_TABLES.includes(table) || isPipingTable) {
      if (hasDiaColumn) baseColumns.push({ title: 'DIA (mm)', dataIndex: 'Dia', key: 'Dia', width: 100 });
      baseColumns.push({ title: 'DESCRIPTION', dataIndex: 'Description', key: 'Description', ellipsis: true });
      baseColumns.push({ title: 'UNIT', dataIndex: 'Unit', key: 'Unit', width: 100 });
      baseColumns.push({ title: 'CODE', dataIndex: 'Code', key: 'Code', width: 120 });
      baseColumns.push({ title: 'RATE (₹)', dataIndex: 'Rate', key: 'Rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> });
    } else {
      tableSchema.columns.filter(c => !['id', 'SlNo', 'display_slno'].includes(c.name)).forEach(col => {
        baseColumns.push({ title: col.name.replace(/_/g, ' ').toUpperCase(), dataIndex: col.name, key: col.name, ellipsis: true });
      });
    }
    return baseColumns;
  }, [tableSchema, table, isPipingTable, hasDiaColumn]);

  const actionColumn = {
    title: 'ACTIONS',
    key: 'actions',
    fixed: 'right',
    width: 120,
    render: (_, record) => (
      <Space size="small">
        <Tooltip title="Edit">
          <Button type="link" icon={<EditOutlined />} onClick={() => onStartEdit(record)} disabled={isHistoricalView || isDateLocked} style={{ color: "#667eea" }} />
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm title="Delete?" onConfirm={() => onDeleteRecord(record.SlNo)}>
            <Button type="link" danger icon={<DeleteOutlined />} disabled={isHistoricalView || isDateLocked} />
          </Popconfirm>
        </Tooltip>
      </Space>
    )
  };

  const allColumns = [...getColumnsForTable(), actionColumn];
  const filteredRecords = useMemo(() => searchTerm ? records.filter(r => Object.values(r).some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))) : records, [records, searchTerm]);

  useEffect(() => {
    if (editingId) {
      const record = records.find(r => r.SlNo === editingId);
      if (record && (MASTER_TABLES.includes(table) || table === "excavation_rates" || isPipingTable)) {
        form.setFieldsValue({ Code: record.Code, Rate: record.Rate, Description: record.Description });
      } else if (record) {
        form.setFieldsValue(record);
      }
    } else {
      form.resetFields();
    }
  }, [editingId, records, form, table, isPipingTable]);

  const renderFormFields = () => {
    if (table === "excavation_rates") {
      return (
        <>
          <Col span={12}>
            <Form.Item name="Code" label="Code" rules={[{ required: true }]}>
              <Input placeholder="1.1 / 1.2" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Rate" label="Rate (₹)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} placeholder="Rate" min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="Description" label="Description">
              <TextArea placeholder="Description" rows={3} />
            </Form.Item>
          </Col>
        </>
      );
    }
    if (MASTER_TABLES.includes(table) || isPipingTable) {
      return (
        <>
          <Col span={12}>
            <Form.Item name="Code" label="Code">
              <Input placeholder="Item Code" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="Rate" label="Rate (₹)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} placeholder="Rate" min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" />
            </Form.Item>
          </Col>
        </>
      );
    }
    return tableSchema.columns?.filter(c => !['id', 'SlNo', 'display_slno'].includes(c.name)).map(col => (
      <Col xs={24} sm={12} key={col.name}>
        <Form.Item name={col.name} label={col.name.replace(/_/g, ' ').toUpperCase()}>
          {col.type?.includes('INT') || col.type?.includes('FLOAT') || col.name?.includes('rate') ? 
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} size="large" /> : 
            <Input size="large" />}
        </Form.Item>
      </Col>
    ));
  };

  const handleCreateTableSubmit = async (values) => {
    await onCreateTable(values);
    setCreateTableModal(false);
    newTableForm.resetFields();
  };

  const handleAddColumnSubmit = async (values) => {
    await onAddColumn(values);
    setAddColumnModal(false);
    newColumnForm.resetFields();
  };

  return (
    <div>
      {DISCOUNT_ENABLED_TABLES.includes(table) && records.length > 0 && (
        <BulkDiscountManager tableName={table} records={records} onApplyDiscount={(p) => onApplyBulkDiscount(table, p)} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} loading={bulkDiscountLoading} />
      )}
      
      <AnimatedCard
        title={<Space><DatabaseOutlined style={{ color: "#667eea" }} />Database Explorer</Space>}
        extra={
          <Space wrap>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateTableModal(true)} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Create Table</Button>
            <Button icon={<PlusOutlined />} onClick={() => setAddColumnModal(true)} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Add Column</Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteColumnModal(true)} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Del Column</Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteTableModal(true)} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Del Table</Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Select
              value={table}
              onChange={onTableChange}
              style={{ width: "100%" }}
              size="large"
              suffixIcon={<TableOutlined />}
            >
              {tables.filter(t => !['mep_rates', 'jacuzzi_spa_mep_master', 'waterbody_mep_items'].includes(t)).map(tn => (
                <Option key={tn} value={tn}>{tn.replace(/_/g, " ").toUpperCase()}</Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Input
              placeholder="Search records..."
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={e => onSearch(e.target.value)}
              allowClear
              size="large"
              style={{ width: 250, borderRadius: "10px" }}
            />
          </Col>
          <Col>
            <Button icon={<ExportOutlined />} onClick={() => onExport('csv')} size="large" style={{ borderRadius: "10px" }}>CSV</Button>
          </Col>
          <Col>
            <Button icon={<ExportOutlined />} onClick={() => onExport('json')} size="large" style={{ borderRadius: "10px" }}>JSON</Button>
          </Col>
        </Row>
      </AnimatedCard>

      <AnimatedCard
        title={<Space>{editingId ? <EditOutlined /> : <PlusOutlined />}{editingId ? `Edit Record #${editingId}` : "Add New Record"}</Space>}
        extra={editingId && <Button onClick={() => onStartEdit(null)} icon={<CloseCircleOutlined />}>Cancel Edit</Button>}
        style={{ marginTop: 24 }}
      >
        <Form form={form} layout="vertical">
          <Row gutter={[24, 24]}>{renderFormFields()}</Row>
          <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
            <Space size="middle">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => editingId ? onSaveRecord(editingId, form.getFieldsValue()) : onSaveRecord(null, form.getFieldsValue())}
                  loading={loading}
                  disabled={isHistoricalView || isDateLocked}
                  icon={editingId ? <CheckCircleOutlined /> : <PlusOutlined />}
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none", borderRadius: "12px", minWidth: 120 }}
                >
                  {editingId ? "Update Record" : "Add Record"}
                </Button>
              </motion.div>
              <Button onClick={() => form.resetFields()} size="large" icon={<ReloadOutlined />}>Clear</Button>
            </Space>
          </Form.Item>
        </Form>
      </AnimatedCard>

      <AnimatedCard
        title={<Space><TableOutlined style={{ color: "#667eea" }} />Records ({filteredRecords.length})</Space>}
        extra={selectedRecords.length > 0 && (
          <Popconfirm title={`Delete ${selectedRecords.length} records?`} onConfirm={onBulkDelete}>
            <Button danger icon={<DeleteOutlined />}>Delete Selected</Button>
          </Popconfirm>
        )}
        style={{ marginTop: 24 }}
      >
        <ReusableTable data={filteredRecords} columns={allColumns} loading={loading} selectedRowKeys={selectedRecords} onSelectChange={onSelectRecords} rowKey="SlNo" pagination={{ pageSize: screens.md ? 10 : 5 }} />
      </AnimatedCard>

      <Modal title="Create New Table" open={createTableModal} onCancel={() => { setCreateTableModal(false); newTableForm.resetFields(); }} onOk={() => newTableForm.submit()} width={screens.md ? 800 : '95%'} centered>
        <Form form={newTableForm} layout="vertical" onFinish={handleCreateTableSubmit}>
          <Form.Item name="table_name" label="Table Name" rules={[{ required: true, pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/ }]}>
            <Input placeholder="new_table" size="large" />
          </Form.Item>
          <Form.List name="columns">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row key={key} gutter={8} align="middle">
                    <Col span={10}><Form.Item name={[name, 'name']} label="Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                    <Col span={12}><Form.Item name={[name, 'type']} label="Type" rules={[{ required: true }]}><Select><Option value="VARCHAR(255)">Text</Option><Option value="INT">Integer</Option><Option value="FLOAT">Float</Option><Option value="DECIMAL(10,2)">Decimal</Option></Select></Form.Item></Col>
                    <Col span={2}><Button onClick={() => remove(name)} icon={<DeleteOutlined />} danger /></Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Column</Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal title="Add Column" open={addColumnModal} onCancel={() => { setAddColumnModal(false); newColumnForm.resetFields(); }} onOk={() => newColumnForm.submit()} centered>
        <Form form={newColumnForm} layout="vertical" onFinish={handleAddColumnSubmit}>
          <Form.Item name="name" label="Column Name" rules={[{ required: true, pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/ }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item name="type" label="Data Type" rules={[{ required: true }]}>
            <Select size="large">
              <Option value="VARCHAR(255)">Text (VARCHAR)</Option>
              <Option value="INT">Integer</Option>
              <Option value="FLOAT">Float</Option>
              <Option value="DECIMAL(10,2)">Decimal</Option>
              <Option value="DATE">Date</Option>
              <Option value="TEXT">Long Text</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Delete Column" open={deleteColumnModal} onCancel={() => setDeleteColumnModal(false)} footer={[<Button key="cancel" onClick={() => setDeleteColumnModal(false)}>Cancel</Button>,<Button key="delete" danger onClick={() => { const col = newColumnForm.getFieldValue('column'); if (col) { onDeleteColumn(col); setDeleteColumnModal(false); } }}>Delete</Button>]} centered>
        <Form form={newColumnForm}>
          <Form.Item name="column" label="Select Column" rules={[{ required: true }]}>
            <Select size="large">
              {tableSchema.columns?.filter(c => !['id', 'SlNo', 'display_slno'].includes(c.name)).map(c => (<Option key={c.name} value={c.name}>{c.name} ({c.type})</Option>))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Delete Entire Table" open={deleteTableModal} onCancel={() => setDeleteTableModal(false)} footer={[<Button key="cancel" onClick={() => setDeleteTableModal(false)}>Cancel</Button>,<Button key="delete" danger onClick={onDeleteTable}>Delete Permanently</Button>]} centered>
        <Alert message={`Delete table "${table}"?`} description="This action cannot be undone. All data will be permanently lost." type="error" showIcon />
      </Modal>
    </div>
  );
};

// ==================== Dashboard Overview Component ====================
const DashboardOverview = ({ stats, availableTables, mepRates, jacuzziSpaRecords, waterbodyRecords, excavationRates, loading }) => {
  const screens = useBreakpoint();
  const chartData = useMemo(() => ({
    tables: availableTables.length,
    records: stats.totalRecords || 0,
    mep: mepRates.length,
    excavation: excavationRates?.length || 0,
    jacuzzi: jacuzziSpaRecords.length,
    waterbody: waterbodyRecords.length,
    value: stats.totalValue || 0
  }), [availableTables, stats, mepRates, excavationRates, jacuzziSpaRecords, waterbodyRecords]);

  return (
    <div>
      <motion.div variants={fadeIn} initial="initial" animate="animate">
        <div style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
          borderRadius: "24px", 
          padding: screens.md ? "40px" : "24px",
          marginBottom: "32px",
          color: "white",
          position: "relative",
          overflow: "hidden"
        }}>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Title level={2} style={{ color: "white", marginBottom: 8 }}>Welcome Back, Admin!</Title>
            <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 16 }}>
              Here's what's happening with your business today.
            </Text>
          </motion.div>
          <div style={{ position: "absolute", top: -50, right: -50, opacity: 0.1 }}>
            <RocketOutlined style={{ fontSize: 200 }} />
          </div>
        </div>
      </motion.div>

      <Row gutter={[24, 24]}>
        <Col xs={12} sm={12} md={8} lg={4}>
          <AnimatedStatCard title="Tables" value={chartData.tables} icon={<TableOutlined />} color="#667eea" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <AnimatedStatCard title="Records" value={chartData.records} icon={<DatabaseOutlined />} color="#52c41a" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <AnimatedStatCard title="MEP Rates" value={chartData.mep} icon={<SettingOutlined />} color="#fa8c16" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <AnimatedStatCard title="Excavation" value={chartData.excavation} icon={<ToolOutlined />} color="#722ed1" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <AnimatedStatCard title="Jacuzzi" value={chartData.jacuzzi} icon={<DashboardOutlined />} color="#eb2f96" />
        </Col>
        <Col xs={12} sm={12} md={8} lg={4}>
          <AnimatedStatCard title="Total Value" value={chartData.value} icon={<WalletOutlined />} color="#13c2c2" prefix="₹" />
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <AnimatedCard title="Quick Actions" style={{ height: "100%" }}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <motion.div whileHover={{ x: 10 }}>
                <Button type="primary" icon={<DatabaseOutlined />} href="#database" block style={{ height: 48, borderRadius: "12px", background: "linear-gradient(135deg, #667eea, #764ba2)" }}>Database Management</Button>
              </motion.div>
              <motion.div whileHover={{ x: 10 }}>
                <Button icon={<SettingOutlined />} href="#mep" block style={{ height: 48, borderRadius: "12px" }}>MEP Rates</Button>
              </motion.div>
              <motion.div whileHover={{ x: 10 }}>
                <Button icon={<ToolOutlined />} href="#excavation" block style={{ height: 48, borderRadius: "12px" }}>Excavation Rates</Button>
              </motion.div>
              <motion.div whileHover={{ x: 10 }}>
                <Button icon={<HomeOutlined />} href="#tenant_profile" block style={{ height: 48, borderRadius: "12px" }}>Company Profile</Button>
              </motion.div>
            </Space>
          </AnimatedCard>
        </Col>
        <Col xs={24} md={12}>
          <AnimatedCard title="System Status" style={{ height: "100%" }}>
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>Database Health</Text>
                  <Tag color="success">98%</Tag>
                </div>
                <Progress percent={98} strokeColor="#52c41a" showInfo={false} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>Storage Usage</Text>
                  <Tag color="processing">45%</Tag>
                </div>
                <Progress percent={45} strokeColor="#1890ff" showInfo={false} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text>API Response Time</Text>
                  <Tag color="warning">245ms</Tag>
                </div>
                <Progress percent={24} strokeColor="#faad14" showInfo={false} />
              </div>
            </Space>
          </AnimatedCard>
        </Col>
      </Row>
      
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <AnimatedCard title="Recent Activity">
            <Timeline
              items={[
                { color: "green", children: <><strong>System Update</strong><br />New features deployed</>, time: "2 min ago" },
                { color: "blue", children: <><strong>Rate Update</strong><br />MEP rates were modified</>, time: "1 hour ago" },
                { color: "orange", children: <><strong>Backup Completed</strong><br />Database backup successful</>, time: "3 hours ago" },
                { color: "purple", children: <><strong>User Login</strong><br />Admin logged in from new device</>, time: "5 hours ago" },
              ]}
            />
          </AnimatedCard>
        </Col>
      </Row>
    </div>
  );
};

// ==================== TenantProfileManager Component ====================
const TenantProfileManager = ({ tenantProfile, loading, isHistoricalView, isDateLocked, onProfileUpdateSuccess }) => {
  const [form] = Form.useForm();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [stampFile, setStampFile] = useState(null);
  const [stampPreview, setStampPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const screens = useBreakpoint();

  useEffect(() => {
    if (tenantProfile) {
      form.setFieldsValue({
        company_name: tenantProfile.company_name || '',
        director_name: tenantProfile.director_name || '',
        gst_number: tenantProfile.gst_number || '',
        address: tenantProfile.address || '',
        phone: tenantProfile.phone || '',
        email: tenantProfile.email || '',
        website: tenantProfile.website || ''
      });
      setLogoPreview(tenantProfile?.logo_url ? `${API_BASE_URL}/${tenantProfile.logo_url.replace(/\\/g, "/")}` : null);
      setStampPreview(tenantProfile?.stamp_url ? `${API_BASE_URL}/${tenantProfile.stamp_url.replace(/\\/g, "/")}` : null);
    }
  }, [tenantProfile, form]);

  const handleSubmit = async (values) => {
    if (isHistoricalView || isDateLocked) return message.error("Cannot update in historical view.");
    setSaving(true);
    try {
      const formData = new FormData();
      Object.keys(values).forEach(key => formData.append(key, values[key]));
      if (logoFile) formData.append('logo', logoFile);
      if (stampFile) formData.append('stamp', stampFile);
      const data = await apiRequestFormData('/admin/tenant/profile', formData, "PUT");
      message.success("Profile updated successfully!");
      if (data?.data) onProfileUpdateSuccess(data.data);
    } catch (error) { message.error(error.message || "Update failed"); } 
    finally { setSaving(false); }
  };

  return (
    <div>
      <DescriptionSection title="Company Profile" content="Manage your company information, logo, and stamp used in quotations." />
      
      <AnimatedCard
        title={<Space><HomeOutlined style={{ color: "#667eea" }} />Company Information</Space>}
        loading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={[32, 24]}>
            <Col xs={24} md={12}>
              <div style={{ textAlign: "center", padding: 24, background: "#fafafa", borderRadius: "20px" }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" style={{ width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: "12px" }} />
                ) : (
                  <div style={{ height: 150, background: "#f0f0f0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <HomeOutlined style={{ fontSize: 48, color: "#bfbfbf" }} />
                  </div>
                )}
                <Dragger
                  showUploadList={false}
                  customRequest={({ onSuccess }) => setTimeout(onSuccess, 0)}
                  onChange={({ file }) => { setLogoFile(file.originFileObj); setLogoPreview(URL.createObjectURL(file.originFileObj)); }}
                  beforeUpload={(file) => (file.type.startsWith('image/') && file.size < 2 * 1024 * 1024) || (message.error('Invalid file'), Upload.LIST_IGNORE)}
                  style={{ marginTop: 16, background: "transparent" }}
                >
                  <p><UploadOutlined /> Upload Logo</p>
                </Dragger>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div style={{ textAlign: "center", padding: 24, background: "#fafafa", borderRadius: "20px" }}>
                {stampPreview ? (
                  <img src={stampPreview} alt="Stamp" style={{ width: "100%", maxHeight: 150, objectFit: "contain", borderRadius: "12px" }} />
                ) : (
                  <div style={{ height: 150, background: "#f0f0f0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <SafetyCertificateOutlined style={{ fontSize: 48, color: "#bfbfbf" }} />
                  </div>
                )}
                <Dragger
                  showUploadList={false}
                  customRequest={({ onSuccess }) => setTimeout(onSuccess, 0)}
                  onChange={({ file }) => { setStampFile(file.originFileObj); setStampPreview(URL.createObjectURL(file.originFileObj)); }}
                  beforeUpload={(file) => (file.type.startsWith('image/') && file.size < 2 * 1024 * 1024) || (message.error('Invalid file'), Upload.LIST_IGNORE)}
                  style={{ marginTop: 16, background: "transparent" }}
                >
                  <p><UploadOutlined /> Upload Stamp</p>
                </Dragger>
              </div>
            </Col>
          </Row>

          <Row gutter={[24, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} md={12}><Form.Item name="company_name" label="Company Name" rules={[{ required: true }]}><Input placeholder="Company Name" size="large" prefix={<HomeOutlined />} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="director_name" label="Director Name"><Input placeholder="Director Name" size="large" prefix={<UserOutlined />} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="gst_number" label="GST Number" rules={[{ required: true }]}><Input placeholder="GST Number" size="large" prefix={<IdcardOutlined />} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="phone" label="Phone" rules={[{ required: true }]}><Input placeholder="Phone" size="large" prefix={<PhoneOutlined />} /></Form.Item></Col>
            <Col xs={24}><Form.Item name="email" label="Email" rules={[{ type: 'email', required: true }]}><Input placeholder="Email" size="large" prefix={<MailOutlined />} /></Form.Item></Col>
            <Col xs={24}><Form.Item name="website" label="Website"><Input placeholder="Website" size="large" prefix={<GlobalOutlined />} /></Form.Item></Col>
            <Col xs={24}><Form.Item name="address" label="Address" rules={[{ required: true }]}><TextArea rows={3} placeholder="Address" size="large" /></Form.Item></Col>
          </Row>

          <Form.Item style={{ marginTop: 24, textAlign: "right" }}>
            <Space>
              <Button onClick={() => form.resetFields()} size="large" icon={<RollbackOutlined />}>Reset</Button>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="primary" htmlType="submit" loading={saving} size="large" icon={<SaveOutlined />} style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", border: "none", borderRadius: "12px" }}>Save Profile</Button>
              </motion.div>
            </Space>
          </Form.Item>
        </Form>
      </AnimatedCard>
    </div>
  );
};

// ==================== MEPRatesManager Component ====================
const MEPRatesManager = ({ data, loading, isHistoricalView, isDateLocked, onRefresh, onCreate, onUpdate, onDelete, searchTerm, onSearch, onApplyBulkDiscount, bulkDiscountLoading }) => {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const screens = useBreakpoint();

  const columns = [
    { title: 'ID', dataIndex: 'SlNo', key: 'SlNo', width: 70, align: 'center', render: (t) => <Tag color="geekblue">#{t}</Tag> },
    { title: 'Filter Dia (mm)', dataIndex: 'filter_dia', key: 'filter_dia', width: 120, render: (v) => <Tag color="cyan">{v} mm</Tag> },
    { title: 'HP', dataIndex: 'hp', key: 'hp', width: 80, render: (v) => <Tag color="purple">{v} HP</Tag> },
    { title: 'Filter Rate (₹)', dataIndex: 'filter_rate', key: 'filter_rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#1890ff" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Pump Rate (₹)', dataIndex: 'pump_rate', key: 'pump_rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Actions', key: 'actions', width: 120, render: (_, r) => (<Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditingId(r.SlNo); form.setFieldsValue(r); setModalVisible(true); }} /><Popconfirm title="Delete?" onConfirm={() => onDelete(r.SlNo)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm></Space>) }
  ];

  const filteredData = useMemo(() => searchTerm ? data.filter(i => Object.values(i).some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))) : data, [data, searchTerm]);

  const handleSubmit = async (values) => {
    if (editingId) {
      await onUpdate(editingId, values);
    } else {
      await onCreate(values);
    }
    setModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  return (
    <div>
      <DescriptionSection title="MEP Rates Management" content="Manage Mechanical, Electrical, and Plumbing rates for filters and pumps." />
      
      {data.length > 0 && (
        <BulkDiscountManager tableName="mep_rates" records={data} onApplyDiscount={(p) => onApplyBulkDiscount('mep_rates', p)} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} loading={bulkDiscountLoading} />
      )}
      
      <AnimatedCard
        title={<Space><SettingOutlined style={{ color: "#667eea" }} />MEP Rates</Space>}
        extra={
          <Space wrap>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => onSearch(e.target.value)} allowClear style={{ width: 200 }} />
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalVisible(true); }} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Add Rate</Button>
          </Space>
        }
      >
        <ReusableTable data={filteredData} columns={columns} loading={loading} rowKey="SlNo" pagination={{ pageSize: screens.md ? 10 : 5 }} />
      </AnimatedCard>

      <Modal title={editingId ? "Edit MEP Rate" : "Add MEP Rate"} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingId(null); form.resetFields(); }} onOk={() => form.submit()} width={screens.md ? 700 : '95%'} centered>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={24}>
            <Col span={12}><Form.Item name="filter_dia" label="Filter Dia (mm)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} disabled={!!editingId} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item name="hp" label="HP" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} disabled={!!editingId} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item name="filter_rate" label="Filter Rate (₹)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" /></Form.Item></Col>
            <Col span={12}><Form.Item name="pump_rate" label="Pump Rate (₹)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

// ==================== JacuzziManager Component ====================
const JacuzziManager = ({ data, loading, isHistoricalView, isDateLocked, onRefresh, onCreate, onUpdate, onDelete, searchTerm, onSearch, onApplyBulkDiscount, bulkDiscountLoading }) => {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const screens = useBreakpoint();

  const columns = [
    { title: 'ID', dataIndex: 'SlNo', key: 'SlNo', width: 70, render: (t) => <Tag color="geekblue">#{t}</Tag> },
    { title: 'Description', dataIndex: 'Description', key: 'Description', ellipsis: true },
    { title: 'Unit', dataIndex: 'Unit', key: 'Unit', width: 80, render: (t) => <Tag color="cyan">{t}</Tag> },
    { title: 'Code', dataIndex: 'Code', key: 'Code', width: 100, render: (t) => <Tag color="purple">{t}</Tag> },
    { title: 'Rate (₹)', dataIndex: 'Rate', key: 'Rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Actions', key: 'actions', width: 100, render: (_, r) => (<Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditingId(r.SlNo); form.setFieldsValue({ Code: r.Code, Rate: r.Rate }); setModalVisible(true); }} /><Popconfirm title="Delete?" onConfirm={() => onDelete(r.SlNo)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm></Space>) }
  ];

  const filteredData = useMemo(() => searchTerm ? data.filter(i => Object.values(i).some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))) : data, [data, searchTerm]);

  const handleSubmit = async (values) => {
    if (editingId) {
      await onUpdate(editingId, values);
    } else {
      await onCreate(values);
    }
    setModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  return (
    <div>
      <DescriptionSection title="Jacuzzi Spa Management" content="Manage Jacuzzi and spa-related components and their rates." />
      
      {data.length > 0 && (
        <BulkDiscountManager tableName="jacuzzi_spa_mep_master" records={data} onApplyDiscount={(p) => onApplyBulkDiscount('jacuzzi_spa_mep_master', p)} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} loading={bulkDiscountLoading} />
      )}
      
      <AnimatedCard
        title={<Space><DashboardOutlined style={{ color: "#667eea" }} />Jacuzzi Spa Components</Space>}
        extra={
          <Space wrap>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => onSearch(e.target.value)} allowClear style={{ width: 200 }} />
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalVisible(true); }} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Add Item</Button>
          </Space>
        }
      >
        <ReusableTable data={filteredData} columns={columns} loading={loading} rowKey="SlNo" pagination={{ pageSize: screens.md ? 10 : 5 }} />
      </AnimatedCard>

      <Modal title={editingId ? "Edit Item" : "Add Item"} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingId(null); form.resetFields(); }} onOk={() => form.submit()} centered>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="Code" label="Code" rules={[{ required: true }]}><Input placeholder="Item Code" size="large" /></Form.Item>
          <Form.Item name="Rate" label="Rate (₹)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ==================== WaterbodyManager Component ====================
const WaterbodyManager = ({ data, loading, isHistoricalView, isDateLocked, onRefresh, onCreate, onUpdate, onDelete, searchTerm, onSearch, onApplyBulkDiscount, bulkDiscountLoading }) => {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const screens = useBreakpoint();

  const columns = [
    { title: 'ID', dataIndex: 'SlNo', key: 'SlNo', width: 70, render: (t) => <Tag color="geekblue">#{t}</Tag> },
    { title: 'Description', dataIndex: 'Description', key: 'Description', ellipsis: true },
    { title: 'Unit', dataIndex: 'Unit', key: 'Unit', width: 80, render: (t) => <Tag color="orange">{t}</Tag> },
    { title: 'Code', dataIndex: 'Code', key: 'Code', width: 100, render: (t) => <Tag color="green">{t}</Tag> },
    { title: 'Rate (₹)', dataIndex: 'Rate', key: 'Rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Actions', key: 'actions', width: 100, render: (_, r) => (<Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditingId(r.SlNo); form.setFieldsValue({ Code: r.Code, Rate: r.Rate }); setModalVisible(true); }} /><Popconfirm title="Delete?" onConfirm={() => onDelete(r.SlNo)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm></Space>) }
  ];

  const filteredData = useMemo(() => searchTerm ? data.filter(i => Object.values(i).some(v => String(v || '').toLowerCase().includes(searchTerm.toLowerCase()))) : data, [data, searchTerm]);

  const handleSubmit = async (values) => {
    if (editingId) {
      await onUpdate(editingId, values);
    } else {
      await onCreate(values);
    }
    setModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  return (
    <div>
      <DescriptionSection title="Waterbody MEP Management" content="Manage waterbody-related mechanical, electrical, and plumbing components." />
      
      {data.length > 0 && (
        <BulkDiscountManager tableName="waterbody_mep_items" records={data} onApplyDiscount={(p) => onApplyBulkDiscount('waterbody_mep_items', p)} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} loading={bulkDiscountLoading} />
      )}
      
      <AnimatedCard
        title={<Space><AppstoreOutlined style={{ color: "#667eea" }} />Waterbody MEP Items</Space>}
        extra={
          <Space wrap>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => onSearch(e.target.value)} allowClear style={{ width: 200 }} />
            <Button icon={<ReloadOutlined />} onClick={onRefresh} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalVisible(true); }} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Add Item</Button>
          </Space>
        }
      >
        <ReusableTable data={filteredData} columns={columns} loading={loading} rowKey="SlNo" pagination={{ pageSize: screens.md ? 10 : 5 }} />
      </AnimatedCard>

      <Modal title={editingId ? "Edit Item" : "Add Item"} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingId(null); form.resetFields(); }} onOk={() => form.submit()} centered>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="Code" label="Code" rules={[{ required: true }]}><Input placeholder="Item Code" size="large" /></Form.Item>
          <Form.Item name="Rate" label="Rate (₹)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ==================== ProjectsManager Component ====================
const ProjectsManager = ({ projects, loading, onDeleteProject, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const screens = useBreakpoint();

  const filteredProjects = useMemo(() => searchTerm ? projects.filter(p => (p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.project_name?.toLowerCase().includes(searchTerm.toLowerCase()))) : projects, [projects, searchTerm]);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 70, render: (t) => <Tag color="geekblue">#{t}</Tag> },
    { title: 'Client', dataIndex: 'client_name', key: 'client_name', ellipsis: true, render: (t) => <><UserOutlined /> {t}</> },
    { title: 'Phone', dataIndex: 'client_phone', key: 'client_phone', width: 120 },
    { title: 'Project', dataIndex: 'project_name', key: 'project_name', ellipsis: true },
    { title: 'Type', dataIndex: 'project_type', key: 'project_type', width: 100, render: (t) => <Tag color="cyan">{t}</Tag> },
    { title: 'Total (₹)', dataIndex: 'total_cost', key: 'total_cost', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Actions', key: 'actions', width: 100, render: (_, r) => (<Space><Button type="link" icon={<EyeOutlined />} onClick={() => { setSelectedProject(r); setViewOpen(true); }} /><Popconfirm title="Delete?" onConfirm={() => onDeleteProject(r.id)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm></Space>) }
  ];

  return (
    <div>
      <DescriptionSection title="Client Projects Management" content="View and manage all client projects saved from the calculator." />
      
      <AnimatedCard
        title={<Space><FolderOpenOutlined style={{ color: "#667eea" }} />Client Projects</Space>}
        extra={
          <Space wrap>
            <Input placeholder="Search..." prefix={<SearchOutlined />} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} allowClear style={{ width: 200 }} />
            <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Refresh</Button>
          </Space>
        }
      >
        <ReusableTable data={filteredProjects} columns={columns} loading={loading} rowKey="id" pagination={{ pageSize: screens.md ? 10 : 5 }} />
      </AnimatedCard>

      <Modal open={viewOpen} onCancel={() => setViewOpen(false)} footer={[<Button key="close" onClick={() => setViewOpen(false)}>Close</Button>,<Button danger onClick={() => { if (selectedProject) { onDeleteProject(selectedProject.id); setViewOpen(false); } }}>Delete</Button>]} width={screens.md ? 900 : '95%'} title="Project Details" centered>
        {selectedProject && (
          <div>
            <Descriptions title="Client Details" column={screens.md ? 2 : 1} bordered>
              <Descriptions.Item label="Client Name">{selectedProject.client_name}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedProject.client_phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedProject.client_email}</Descriptions.Item>
              <Descriptions.Item label="Address">{selectedProject.client_address}</Descriptions.Item>
              <Descriptions.Item label="Project Name">{selectedProject.project_name}</Descriptions.Item>
              <Descriptions.Item label="Project Type"><Tag color="blue">{selectedProject.project_type}</Tag></Descriptions.Item>
              <Descriptions.Item label="Pool Type"><Tag color="green">{selectedProject.pool_type}</Tag></Descriptions.Item>
              <Descriptions.Item label="Dimensions">{selectedProject.length} x {selectedProject.width} x {selectedProject.depth} m</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Title level={5}>Cost Breakdown</Title>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}><Card><Statistic title="Main Pool" value={selectedProject.result_data?.main_pool_total || 0} precision={2} prefix="₹" /></Card></Col>
              <Col span={12}><Card><Statistic title="Balance Tank" value={selectedProject.result_data?.balance_tank_total || 0} precision={2} prefix="₹" /></Card></Col>
              <Col span={12}><Card><Statistic title="MEP Systems" value={selectedProject.result_data?.mep_total || 0} precision={2} prefix="₹" /></Card></Col>
              <Col span={12}><Card><Statistic title="Piping System" value={selectedProject.result_data?.piping_total || 0} precision={2} prefix="₹" /></Card></Col>
            </Row>
            <Divider />
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Title level={3}>Grand Total</Title>
              <Title level={1} style={{ color: "#cf1322" }}>₹{selectedProject.total_cost?.toLocaleString()}</Title>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ==================== PaymentsManager Component ====================
const PaymentsManager = ({ payments, loading, onRefresh }) => {
  const downloadReceipt = async (paymentId) => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}/admin/payments/${paymentId}/receipt`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `receipt_${paymentId}.txt`; a.click(); URL.revokeObjectURL(url);
      message.success("Receipt downloaded successfully!");
    } catch (error) { message.error(error.message); }
  };

  const columns = [
    { title: 'Transaction ID', dataIndex: 'transaction_id', key: 'transaction_id', width: 200, render: (t) => <Text code>{t}</Text> },
    { title: 'Amount (₹)', dataIndex: 'amount', key: 'amount', width: 120, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Method', dataIndex: 'payment_method', key: 'payment_method', width: 100, render: (t) => <Tag color="blue">{t}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (s) => <Tag color={s === 'success' ? 'green' : 'orange'}>{s.toUpperCase()}</Tag> },
    { title: 'Date', dataIndex: 'paid_at', key: 'paid_at', width: 180, render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Receipt', key: 'receipt', width: 100, render: (_, r) => r.status === "success" && <Button type="link" icon={<DownloadOutlined />} onClick={() => downloadReceipt(r.id)}>Get</Button> }
  ];

  return (
    <div>
      <DescriptionSection title="Payment History" content="View all payment transactions and download receipts for successful payments." />
      
      <AnimatedCard
        title={<Space><CreditCardOutlined style={{ color: "#667eea" }} />Payment Transactions</Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Refresh</Button>}
      >
        <ReusableTable data={payments} columns={columns} loading={loading} rowKey="id" pagination={{ pageSize: 10 }} />
      </AnimatedCard>
    </div>
  );
};

// ==================== ExcavationManager Component ====================
const ExcavationManager = ({ data, loading, onRefresh, onCreate, onUpdate, onDelete, onApplyBulkDiscount, bulkDiscountLoading, isHistoricalView, isDateLocked }) => {
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const screens = useBreakpoint();

  const columns = [
    { title: 'ID', dataIndex: 'SlNo', key: 'SlNo', width: 70, render: (t) => <Tag color="geekblue">#{t}</Tag> },
    { title: 'Code', dataIndex: 'Code', key: 'Code', width: 100, render: (t) => <Tag color="purple">{t}</Tag> },
    { title: 'Description', dataIndex: 'Description', key: 'Description', ellipsis: true },
    { title: 'Rate (₹/m³)', dataIndex: 'Rate', key: 'Rate', width: 140, align: 'right', render: (v) => <Text strong style={{ color: "#52c41a" }}>₹{v?.toLocaleString()}</Text> },
    { title: 'Actions', key: 'actions', width: 100, render: (_, r) => (<Space><Button type="link" icon={<EditOutlined />} onClick={() => { setEditingId(r.id); form.setFieldsValue({ Code: r.Code, Description: r.Description, Rate: r.Rate }); setModalVisible(true); }} /><Popconfirm title="Delete?" onConfirm={() => onDelete(r.id)}><Button type="link" danger icon={<DeleteOutlined />} /></Popconfirm></Space>) }
  ];

  const handleSubmit = async (values) => {
    if (editingId) {
      await onUpdate(editingId, values);
    } else {
      await onCreate(values);
    }
    setModalVisible(false);
    setEditingId(null);
    form.resetFields();
  };

  return (
    <div>
      <DescriptionSection title="Excavation Rates Management" content="Manage excavation rates for different depth ranges. Code 1.1 = up to 1.5m, Code 1.2 = 1.5m to 3m." />
      
      {data.length > 0 && (
        <BulkDiscountManager tableName="excavation_rates" records={data} onApplyDiscount={(p) => onApplyBulkDiscount('excavation_rates', p)} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} loading={bulkDiscountLoading} />
      )}
      
      <AnimatedCard
        title={<Space><ToolOutlined style={{ color: "#667eea" }} />Excavation Rates</Space>}
        extra={
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalVisible(true); }} disabled={isHistoricalView || isDateLocked} style={{ borderRadius: "10px" }}>Add Rate</Button>
          </Space>
        }
      >
        <ReusableTable data={data} columns={columns} loading={loading} rowKey="id" pagination={{ pageSize: screens.md ? 10 : 5 }} />
      </AnimatedCard>

      <Modal title={editingId ? "Edit Excavation Rate" : "Add Excavation Rate"} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingId(null); form.resetFields(); }} onOk={() => form.submit()} centered>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="Code" label="Code" rules={[{ required: true }]}><Input placeholder="1.1 / 1.2" size="large" /></Form.Item>
          <Form.Item name="Description" label="Description"><Input placeholder="Description" size="large" /></Form.Item>
          <Form.Item name="Rate" label="Rate (₹/m³)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} min={0} step={0.01} formatter={v => `₹ ${v}`} parser={v => v.replace(/₹\s?|(,*)/g, '')} size="large" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

// ==================== Main AdminDashboard Component ====================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Core state
  const [table, setTable] = useState("main_pool");
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [tableSchema, setTableSchema] = useState({});
  const [availableTables, setAvailableTables] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [user, setUser] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [isHistoricalView, setIsHistoricalView] = useState(false);
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [quotationId, setQuotationId] = useState(null);
  const [bulkDiscountLoading, setBulkDiscountLoading] = useState(false);
  const [mepRates, setMepRates] = useState([]);
  const [mepLoading, setMepLoading] = useState(false);
  const [mepSearchTerm, setMepSearchTerm] = useState("");
  const [jacuzziSpaRecords, setJacuzziSpaRecords] = useState([]);
  const [jacuzziLoading, setJacuzziLoading] = useState(false);
  const [jacuzziSearchTerm, setJacuzziSearchTerm] = useState("");
  const [waterbodyRecords, setWaterbodyRecords] = useState([]);
  const [waterbodyLoading, setWaterbodyLoading] = useState(false);
  const [waterbodySearchTerm, setWaterbodySearchTerm] = useState("");
  const [excavationRates, setExcavationRates] = useState([]);
  const [excavationLoading, setExcavationLoading] = useState(false);
  const [tenantProfile, setTenantProfile] = useState(null);
  const [tenantProfileLoading, setTenantProfileLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // API Helpers
  const apiRequestLocal = async (url, method = "GET", body = null) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error("No token");
    const res = await fetch(`${API_BASE_URL}${url}`, { method, headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401) { 
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      localStorage.removeItem(TENANT_INFO_KEY);
      window.location.href = "/admin";
      throw new Error("Session expired");
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  };

  // Fetch Functions
  const fetchExcavationRates = useCallback(async () => {
    try { setExcavationLoading(true); const data = await apiRequestLocal("/admin/excavation-rates", "GET"); setExcavationRates((data || []).map(r => ({ id: r.id, SlNo: r.id, Code: r.code, Description: r.description || "", Rate: r.rate || 0 }))); } catch (err) { console.error(err); setExcavationRates([]); } finally { setExcavationLoading(false); }
  }, []);
  
  const createExcavationRate = async (values) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal("/admin/excavation-rates", "POST", { code: values.Code, description: values.Description, rate: values.Rate }); message.success("Excavation rate created!"); fetchExcavationRates(); } catch (err) { message.error(err.message); } };
  const updateExcavationRate = async (id, values) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/excavation-rates/${id}`, "PUT", { code: values.Code, description: values.Description, rate: values.Rate }); message.success("Excavation rate updated!"); fetchExcavationRates(); } catch (err) { message.error(err.message); } };
  const deleteExcavationRate = async (id) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/excavation-rates/${id}`, "DELETE"); message.success("Excavation rate deleted!"); fetchExcavationRates(); } catch (err) { message.error(err.message); } };
  
  const fetchProjects = useCallback(async () => { try { setProjectsLoading(true); const data = await apiRequestLocal("/admin/projects", "GET"); setProjects(data || []); } catch (err) { message.error(err.message); } finally { setProjectsLoading(false); } }, []);
  const handleDeleteProject = async (id) => { try { await apiRequestLocal(`/admin/projects/${id}`, "DELETE"); message.success("Project deleted!"); fetchProjects(); } catch (err) { message.error(err.message); } };
  const fetchPayments = useCallback(async () => { try { setPaymentsLoading(true); const data = await apiRequestLocal("/admin/payments", "GET"); setPayments(data || []); } catch (err) { message.error(err.message); } finally { setPaymentsLoading(false); } }, []);
  const fetchTenantProfile = useCallback(async () => { try { setTenantProfileLoading(true); const data = await apiRequestLocal('/admin/tenant/profile', 'GET'); if (data?.data) setTenantProfile(data.data); } catch (err) { console.error(err); } finally { setTenantProfileLoading(false); } }, []);
  
  const fetchMepRates = useCallback(async () => { try { setMepLoading(true); const data = await apiRequestLocal('/admin/mep_rates', 'GET'); setMepRates((data || []).map(i => ({ SlNo: i.SlNo, filter_rate: i.filter_rate || 0, pump_rate: i.pump_rate || 0, filter_dia: i.filter_dia || 0, hp: i.hp || 0 }))); } catch (err) { message.error(err.message); } finally { setMepLoading(false); } }, []);
  const createMepRate = async (v) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal('/admin/mep_rates', 'POST', v); message.success("MEP rate created!"); fetchMepRates(); } catch (err) { message.error(err.message); } };
  const updateMepRate = async (id, v) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/mep_rates/${id}`, 'PUT', { filter_rate: v.filter_rate, pump_rate: v.pump_rate }); message.success("MEP rate updated!"); fetchMepRates(); } catch (err) { message.error(err.message); } };
  const deleteMepRate = async (id) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/mep_rates/${id}`, 'DELETE'); message.success("MEP rate deleted!"); fetchMepRates(); } catch (err) { message.error(err.message); } };
  
  const fetchJacuzziSpaRecords = useCallback(async () => { try { setJacuzziLoading(true); const data = await apiRequestLocal(`/admin/jacuzzi_spa_mep_master?effective_date=${effectiveDate}`, 'GET'); setJacuzziSpaRecords((data || []).map(normalizeRow)); } catch (err) { message.error(err.message); } finally { setJacuzziLoading(false); } }, [effectiveDate]);
  const createJacuzziRecord = async (v) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal('/admin/jacuzzi_spa_mep_master', 'POST', v); message.success("Jacuzzi record created!"); fetchJacuzziSpaRecords(); } catch (err) { message.error(err.message); } };
  const updateJacuzziRecord = async (id, v) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/jacuzzi_spa_mep_master/${id}`, 'PUT', v); message.success("Jacuzzi record updated!"); fetchJacuzziSpaRecords(); } catch (err) { message.error(err.message); } };
  const deleteJacuzziRecord = async (id) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/jacuzzi_spa_mep_master/${id}`, 'DELETE'); message.success("Jacuzzi record deleted!"); fetchJacuzziSpaRecords(); } catch (err) { message.error(err.message); } };
  
  const fetchWaterbodyRecords = useCallback(async () => { try { setWaterbodyLoading(true); const data = await apiRequestLocal(`/admin/waterbody_mep_items?effective_date=${effectiveDate}`, 'GET'); setWaterbodyRecords((data || []).map(normalizeRow)); } catch (err) { message.error(err.message); } finally { setWaterbodyLoading(false); } }, [effectiveDate]);
  const createWaterbodyRecord = async (v) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal('/admin/waterbody_mep_items', 'POST', v); message.success("Waterbody record created!"); fetchWaterbodyRecords(); } catch (err) { message.error(err.message); } };
  const updateWaterbodyRecord = async (id, v) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/waterbody_mep_items/${id}`, 'PUT', v); message.success("Waterbody record updated!"); fetchWaterbodyRecords(); } catch (err) { message.error(err.message); } };
  const deleteWaterbodyRecord = async (id) => { if (isHistoricalView || isDateLocked) return; try { await apiRequestLocal(`/admin/waterbody_mep_items/${id}`, 'DELETE'); message.success("Waterbody record deleted!"); fetchWaterbodyRecords(); } catch (err) { message.error(err.message); } };
  
  const fetchRecords = useCallback(async () => {
    if (["mep_rates", "jacuzzi_spa_mep_master", "waterbody_mep_items", "excavation_rates"].includes(table)) return;
    setLoading(true);
    try {
      const endpoint = PIPING_TABLES.includes(table) ? PIPING_ENDPOINTS[table] : `/admin/${table}?effective_date=${effectiveDate}`;
      const data = await apiRequestLocal(endpoint, 'GET');
      let rows = Array.isArray(data) ? data : (data.records || data.items || []);
      const normalized = rows.map(normalizeRow);
      setRecords(normalized);
      setDashboardStats({ totalRecords: normalized.length, totalValue: normalized.reduce((s, r) => s + (r.Rate || 0), 0) });
    } catch (err) { message.error(err.message); setRecords([]); } finally { setLoading(false); }
  }, [table, effectiveDate]);
  
  const fetchTableSchema = useCallback(async (tableName) => {
    try { let data; if (PIPING_TABLES.includes(tableName)) data = { table_name: tableName, columns: [{ name: 'SlNo', type: 'INT' }, { name: 'Dia', type: 'INT' }, { name: 'Description', type: 'VARCHAR' }, { name: 'Unit', type: 'VARCHAR' }, { name: 'Code', type: 'VARCHAR' }, { name: 'Rate', type: 'DECIMAL' }] }; else data = await apiRequestLocal(`/admin/tables/${tableName}/schema`, 'GET'); setTableSchema(data); } catch (err) { message.error(err.message); }
  }, []);
  
  const fetchAvailableTables = useCallback(async () => { try { const data = await apiRequestLocal('/admin/tables', 'GET'); const tables = data.tables || []; setAvailableTables([...new Set([...tables, 'pipes', 'ball_valves', 'puddle_flanges', 'excavation_rates'])]); } catch (err) { setAvailableTables(['pipes', 'ball_valves', 'puddle_flanges', 'main_pool', 'balancetank', 'mep', 'excavation_rates']); } }, []);
  
  const testConnection = useCallback(async () => { try { setConnectionStatus("checking"); await apiRequestLocal('/'); setConnectionStatus("connected"); return true; } catch { setConnectionStatus("error"); return false; } }, []);
  
  const handleAddRecord = async (customData) => { if (isHistoricalView || isDateLocked) return; if (table === "excavation_rates") return createExcavationRate(customData); setLoading(true); try { const payload = (MASTER_TABLES.includes(table) && customData) ? customData : form; await apiRequestLocal(PIPING_TABLES.includes(table) ? `${PIPING_ENDPOINTS[table]}` : `/admin/${table}`, 'POST', payload); message.success("Record added!"); fetchRecords(); setForm({}); } catch (err) { message.error(err.message); } finally { setLoading(false); } };
  const handleUpdateRecord = async (id, customData) => { if (isHistoricalView || isDateLocked) return; if (table === "excavation_rates") return updateExcavationRate(id, customData); setLoading(true); try { const payload = (MASTER_TABLES.includes(table) && customData) ? customData : form; await apiRequestLocal(PIPING_TABLES.includes(table) ? `${PIPING_ENDPOINTS[table]}/${id}` : `/admin/${table}/${id}`, 'PUT', payload); message.success("Record updated!"); setEditingId(null); setForm({}); fetchRecords(); } catch (err) { message.error(err.message); } finally { setLoading(false); } };
  const handleDeleteRecord = async (id) => { if (isHistoricalView || isDateLocked) return; if (table === "excavation_rates") return deleteExcavationRate(id); setLoading(true); try { await apiRequestLocal(PIPING_TABLES.includes(table) ? `${PIPING_ENDPOINTS[table]}/${id}` : `/admin/${table}/${id}`, 'DELETE'); message.success("Record deleted!"); fetchRecords(); } catch (err) { message.error(err.message); } finally { setLoading(false); } };
  const handleBulkDelete = async () => { if (isHistoricalView || isDateLocked) return; if (table === "excavation_rates") { await Promise.all(selectedRecords.map(id => deleteExcavationRate(id))); setSelectedRecords([]); return; } setLoading(true); try { await Promise.all(selectedRecords.map(id => apiRequestLocal(PIPING_TABLES.includes(table) ? `${PIPING_ENDPOINTS[table]}/${id}` : `/admin/${table}/${id}`, 'DELETE'))); message.success(`Deleted ${selectedRecords.length} records`); setSelectedRecords([]); fetchRecords(); } catch (err) { message.error(err.message); } finally { setLoading(false); } };
  const handleExport = (format) => { const dataToExport = records; if (format === 'csv') { const headers = tableSchema.columns?.filter(c => !['id', 'SlNo'].includes(c.name)).map(c => c.name) || ['Description', 'Unit', 'Code', 'Rate']; const csv = [headers.join(','), ...dataToExport.map(r => headers.map(h => `"${r[h] || ''}"`).join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${table}_export_${effectiveDate}.csv`; a.click(); URL.revokeObjectURL(url); } else { const json = JSON.stringify(dataToExport, null, 2); const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${table}_export_${effectiveDate}.json`; a.click(); URL.revokeObjectURL(url); } message.success(`Exported as ${format.toUpperCase()}`); };
  const handleCreateTable = async (data) => { try { await apiRequestLocal('/admin/tables', 'POST', data); message.success(`Table ${data.table_name} created!`); fetchAvailableTables(); } catch (err) { message.error(err.message); } };
  const handleAddColumn = async (data) => { try { await apiRequestLocal(`/admin/tables/${table}/columns`, 'POST', data); message.success(`Column ${data.name} added!`); fetchTableSchema(table); fetchRecords(); } catch (err) { message.error(err.message); } };
  const handleDeleteColumn = async (columnName) => { try { await apiRequestLocal(`/admin/tables/${table}/columns/${columnName}`, 'DELETE'); message.success(`Column ${columnName} deleted!`); fetchTableSchema(table); fetchRecords(); } catch (err) { message.error(err.message); } };
  const handleDeleteTable = async () => { try { await apiRequestLocal(`/admin/tables/${table}`, 'DELETE'); message.success(`Table ${table} deleted!`); fetchAvailableTables(); if (availableTables.length) setTable(availableTables[0]); } catch (err) { message.error(err.message); } };
  
  const handleApplyBulkDiscount = useCallback(async (tableName, discountPercent) => { if (isHistoricalView || isDateLocked) return; setBulkDiscountLoading(true); try { let currentData = []; if (tableName === 'mep_rates') currentData = mepRates; else if (tableName === 'jacuzzi_spa_mep_master') currentData = jacuzziSpaRecords; else if (tableName === 'waterbody_mep_items') currentData = waterbodyRecords; else if (tableName === 'excavation_rates') currentData = excavationRates; else currentData = records; await Promise.all(currentData.map(async (item) => { const id = item.SlNo || item.id; if (tableName === 'mep_rates') await apiRequestLocal(`/admin/mep_rates/${id}`, 'PUT', { filter_rate: item.filter_rate * (1 - discountPercent/100), pump_rate: item.pump_rate * (1 - discountPercent/100) }); else if (tableName === 'excavation_rates') await apiRequestLocal(`/admin/excavation-rates/${id}`, 'PUT', { code: item.Code, description: item.Description, rate: (item.Rate || 0) * (1 - discountPercent/100) }); else await apiRequestLocal(PIPING_TABLES.includes(tableName) ? `${PIPING_ENDPOINTS[tableName]}/${id}` : `/admin/${tableName}/${id}`, 'PUT', { Rate: (item.Rate || 0) * (1 - discountPercent/100) }); })); if (tableName === 'mep_rates') fetchMepRates(); else if (tableName === 'jacuzzi_spa_mep_master') fetchJacuzziSpaRecords(); else if (tableName === 'waterbody_mep_items') fetchWaterbodyRecords(); else if (tableName === 'excavation_rates') fetchExcavationRates(); else fetchRecords(); message.success(`Applied ${discountPercent}% discount!`); } catch (err) { message.error(err.message); } finally { setBulkDiscountLoading(false); } }, [mepRates, jacuzziSpaRecords, waterbodyRecords, excavationRates, records, isHistoricalView, isDateLocked]);

  const loadAllTables = useCallback(async () => { await Promise.all([fetchAvailableTables(), fetchMepRates(), fetchJacuzziSpaRecords(), fetchWaterbodyRecords(), fetchExcavationRates(), fetchPayments(), fetchTenantProfile()]); }, []);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      window.location.href = "/admin";
      return;
    }
    const userData = localStorage.getItem(USER_DATA_KEY);
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error("Error parsing user data");
      }
    }
  }, []);

  useEffect(() => { const init = async () => { const token = localStorage.getItem(AUTH_TOKEN_KEY); if (!token) { navigate("/admin"); return; } const connected = await testConnection(); if (connected) { await loadAllTables(); if (table) { await fetchTableSchema(table); await fetchRecords(); } } else message.error("Cannot connect to server"); }; init(); }, []);
  useEffect(() => { if (connectionStatus === "connected" && table && activeTab === "database") { fetchTableSchema(table); fetchRecords(); } }, [table, connectionStatus, activeTab]);
  useEffect(() => { if (activeTab === "projects") fetchProjects(); }, [activeTab]); 
  useEffect(() => { if (activeTab === "payments") fetchPayments(); }, [activeTab]); 
  useEffect(() => { setIsHistoricalView(dayjs(effectiveDate).startOf('day').isBefore(dayjs().startOf('day'))); }, [effectiveDate]);

  const handleRefresh = () => { if (activeTab === "mep") fetchMepRates(); else if (activeTab === "jacuzzi") fetchJacuzziSpaRecords(); else if (activeTab === "waterbody") fetchWaterbodyRecords(); else if (activeTab === "database") { fetchTableSchema(table); fetchRecords(); } else if (activeTab === "tenant_profile") fetchTenantProfile(); else if (activeTab === "projects") fetchProjects(); else if (activeTab === "payments") fetchPayments(); else if (activeTab === "overview") { fetchMepRates(); fetchJacuzziSpaRecords(); fetchWaterbodyRecords(); fetchExcavationRates(); } message.success("Data refreshed!"); };
  const handleDateChange = (dateStr) => { if (isDateLocked) return; setEffectiveDate(dateStr); setTimeout(() => { if (activeTab === "mep") fetchMepRates(); else if (activeTab === "jacuzzi") fetchJacuzziSpaRecords(); else if (activeTab === "waterbody") fetchWaterbodyRecords(); else if (activeTab === "database" && table !== "excavation_rates") fetchRecords(); }, 100); };
  const resetDateLock = () => { setIsDateLocked(false); setQuotationId(null); setEffectiveDate(dayjs().format("YYYY-MM-DD")); message.info("Date unlocked."); };
  const handleLogout = () => { 
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(TENANT_INFO_KEY);
    window.location.href = "/admin";
  };
  const handleProfileUpdateSuccess = (p) => { setTenantProfile(p); localStorage.setItem(TENANT_INFO_KEY, JSON.stringify(p)); };
  const toggleCollapse = () => setCollapsed(!collapsed);

  const renderSidebarMenu = () => (
    <Menu 
      theme="dark" 
      mode="inline" 
      selectedKeys={[activeTab]} 
      onClick={({ key }) => setActiveTab(key)} 
      style={{ background: "transparent" }} 
      items={[
        { key: "overview", icon: <DashboardOutlined />, label: "Dashboard" },
        { key: "database", icon: <DatabaseOutlined />, label: "Database" },
        { key: "mep", icon: <SettingOutlined />, label: "MEP Rates" },
        { key: "jacuzzi", icon: <DashboardOutlined />, label: "Jacuzzi" },
        { key: "waterbody", icon: <AppstoreOutlined />, label: "Waterbody" },
        { key: "excavation", icon: <ToolOutlined />, label: "Excavation" },
        { key: "tenant_profile", icon: <HomeOutlined />, label: "Profile" },
        { key: "projects", icon: <FolderOpenOutlined />, label: "Projects" },
        { key: "payments", icon: <CreditCardOutlined />, label: "Payments" },
      ]} 
    />
  );

  const renderContent = () => { 
    switch (activeTab) {
      case "overview": 
        return <DashboardOverview stats={dashboardStats} availableTables={availableTables} mepRates={mepRates} jacuzziSpaRecords={jacuzziSpaRecords} waterbodyRecords={waterbodyRecords} excavationRates={excavationRates} loading={loading || mepLoading} />;
      case "database": 
        return <DatabaseManager table={table} tables={availableTables} tableSchema={tableSchema} records={records} loading={loading} editingId={editingId} searchTerm={searchTerm} selectedRecords={selectedRecords} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} dashboardStats={dashboardStats} onTableChange={setTable} onStartEdit={(r) => { if (r) { setEditingId(r.SlNo); if (MASTER_TABLES.includes(table) || table === "excavation_rates") setForm({ Code: r.Code, Rate: r.Rate, Description: r.Description }); } else { setEditingId(null); setForm({}); } }} onSaveRecord={(id, cd) => id ? handleUpdateRecord(id, cd) : handleAddRecord(cd)} onDeleteRecord={handleDeleteRecord} onBulkDelete={handleBulkDelete} onSearch={setSearchTerm} onSelectRecords={setSelectedRecords} onExport={handleExport} onCreateTable={handleCreateTable} onAddColumn={handleAddColumn} onDeleteColumn={handleDeleteColumn} onDeleteTable={handleDeleteTable} onApplyBulkDiscount={handleApplyBulkDiscount} bulkDiscountLoading={bulkDiscountLoading} />;
      case "mep": 
        return <MEPRatesManager data={mepRates} loading={mepLoading} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} onRefresh={fetchMepRates} onCreate={createMepRate} onUpdate={updateMepRate} onDelete={deleteMepRate} searchTerm={mepSearchTerm} onSearch={setMepSearchTerm} onApplyBulkDiscount={handleApplyBulkDiscount} bulkDiscountLoading={bulkDiscountLoading} />;
      case "jacuzzi": 
        return <JacuzziManager data={jacuzziSpaRecords} loading={jacuzziLoading} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} onRefresh={fetchJacuzziSpaRecords} onCreate={createJacuzziRecord} onUpdate={updateJacuzziRecord} onDelete={deleteJacuzziRecord} searchTerm={jacuzziSearchTerm} onSearch={setJacuzziSearchTerm} onApplyBulkDiscount={handleApplyBulkDiscount} bulkDiscountLoading={bulkDiscountLoading} />;
      case "waterbody": 
        return <WaterbodyManager data={waterbodyRecords} loading={waterbodyLoading} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} onRefresh={fetchWaterbodyRecords} onCreate={createWaterbodyRecord} onUpdate={updateWaterbodyRecord} onDelete={deleteWaterbodyRecord} searchTerm={waterbodySearchTerm} onSearch={setWaterbodySearchTerm} onApplyBulkDiscount={handleApplyBulkDiscount} bulkDiscountLoading={bulkDiscountLoading} />;
      case "excavation": 
        return <ExcavationManager data={excavationRates} loading={excavationLoading} onRefresh={fetchExcavationRates} onCreate={createExcavationRate} onUpdate={updateExcavationRate} onDelete={deleteExcavationRate} onApplyBulkDiscount={handleApplyBulkDiscount} bulkDiscountLoading={bulkDiscountLoading} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} />;
      case "tenant_profile": 
        return <TenantProfileManager tenantProfile={tenantProfile} loading={tenantProfileLoading} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} onProfileUpdateSuccess={handleProfileUpdateSuccess} />;
      case "projects": 
        return <ProjectsManager projects={projects} loading={projectsLoading} onDeleteProject={handleDeleteProject} onRefresh={fetchProjects} />;
      case "payments": 
        return <PaymentsManager payments={payments} loading={paymentsLoading} onRefresh={fetchPayments} />;
      default: 
        return <DashboardOverview stats={dashboardStats} availableTables={availableTables} mepRates={mepRates} jacuzziSpaRecords={jacuzziSpaRecords} waterbodyRecords={waterbodyRecords} excavationRates={excavationRates} loading={loading} />;
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#667eea",
        },
      }}
    >
      <Watermark content={tenantProfile?.company_name || "Intelithon"} gap={[100, 100]} zIndex={0}>
        <AdminLayout collapsed={collapsed} onCollapse={setCollapsed} user={user} onLogout={handleLogout} menuContent={renderSidebarMenu()} companyData={tenantProfile}>
          <Layout>
            <HeaderBar user={user} onLogout={handleLogout} connectionStatus={connectionStatus} onRefresh={handleRefresh} effectiveDate={effectiveDate} isHistoricalView={isHistoricalView} isDateLocked={isDateLocked} quotationId={quotationId} onDateChange={handleDateChange} onExitQuotation={resetDateLock} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
            <Content style={{ margin: screens.md ? 24 : 12, padding: screens.md ? 24 : 12, background: "#fff", minHeight: "calc(100vh - 112px)", borderRadius: "24px" }}>
              <AnimatePresence mode="wait">
                {connectionStatus === "error" && (
                  <motion.div key="error" {...fadeIn}>
                    <Result status="error" title="Connection Error" subTitle="Cannot connect to server. Please check if the backend is running." extra={<Button type="primary" onClick={handleRefresh}>Retry</Button>} />
                  </motion.div>
                )}
                {connectionStatus === "checking" && (
                  <motion.div key="loading" {...fadeIn} style={{ textAlign: "center", padding: 100 }}>
                    <Spin size="large" />
                    <Text style={{ display: "block", marginTop: 20 }}>Connecting to server...</Text>
                  </motion.div>
                )}
                {connectionStatus === "connected" && (
                  <motion.div key="content" {...fadeIn}>
                    {renderContent()}
                  </motion.div>
                )}
              </AnimatePresence>
            </Content>
          </Layout>
        </AdminLayout>
      </Watermark>
      <FloatButton.Group shape="circle" style={{ right: 24, bottom: 24 }}>
        <FloatButton tooltip="Help" icon={<QuestionCircleOutlined />} />
        <FloatButton.BackTop visibilityHeight={400} />
        <FloatButton tooltip="Refresh" icon={<ReloadOutlined />} onClick={handleRefresh} />
      </FloatButton.Group>
    </ConfigProvider>
  );
}
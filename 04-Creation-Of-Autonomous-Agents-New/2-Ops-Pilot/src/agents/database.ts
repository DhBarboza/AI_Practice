import { DataTypes, Model, Sequelize } from "sequelize";

interface ServiceAttributes {
  id: string;
  name: string;
  team: string;
  environment: string;
}

interface AlertAttributes {
  id: string;
  service: string;
  title: string;
  severity: "critical" | "warning" | "info";
  status: "firing" | "resolved";
}

export function createDatabaseFromEnv(): Sequelize {
  const database = process.env.MYSQL_DATABASE?.trim();
  const username = process.env.MYSQL_USER?.trim();
  if (!database) throw new Error("MYSQL_DATABASE is required to seed MySQL.");
  if (!username) throw new Error("MYSQL_USER is required to seed MySQL.");

  const port = process.env.MYSQL_PORT
    ? Number.parseInt(process.env.MYSQL_PORT, 10)
    : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("MYSQL_PORT must be a valid TCP port.");
  }

  return new Sequelize(database, username, process.env.MYSQL_PASSWORD ?? "", {
    dialect: "mysql",
    host: process.env.MYSQL_HOST?.trim() || "127.0.0.1",
    port,
    logging: false,
  });
}

export function defineOpsModels(sequelize: Sequelize) {
  const Service = sequelize.define<
    Model<ServiceAttributes, ServiceAttributes>,
    ServiceAttributes
  >(
    "Service",
    {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      name: { type: DataTypes.STRING(128), allowNull: false },
      team: { type: DataTypes.STRING(128), allowNull: false },
      environment: { type: DataTypes.STRING(64), allowNull: false },
    },
    { tableName: "services", timestamps: false },
  );

  const Alert = sequelize.define<
    Model<AlertAttributes, AlertAttributes>,
    AlertAttributes
  >(
    "Alert",
    {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      service: { type: DataTypes.STRING(128), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      severity: {
        type: DataTypes.ENUM("critical", "warning", "info"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("firing", "resolved"),
        allowNull: false,
      },
    },
    { tableName: "alerts", timestamps: false },
  );

  sequelize.define(
    "Incident",
    {
      id: { type: DataTypes.STRING(64), primaryKey: true },
      title: { type: DataTypes.STRING(255), allowNull: false },
      service: { type: DataTypes.STRING(128), allowNull: false },
      severity: {
        type: DataTypes.ENUM("critical", "high", "medium", "low"),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("open", "resolved"),
        allowNull: false,
      },
    },
    { tableName: "incidents", timestamps: false },
  );

  return { Service, Alert };
}

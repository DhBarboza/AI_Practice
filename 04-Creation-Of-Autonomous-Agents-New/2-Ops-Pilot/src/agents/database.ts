import { DataTypes, Model, Sequelize } from "sequelize";
import { z } from "zod";

interface ServiceAttributes {
  id: string;
  name: string;
  team: string;
  environment: string;
}

interface AlertAttributes {
  id: string;
  serviceId: string;
  title: string;
  severity: "critical" | "warning" | "info";
  status: "firing" | "resolved";
}

interface IncidentAttributes {
  id: string;
  title: string;
  serviceId: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "resolved";
}

export function createDatabaseFromEnv(): Sequelize {
  const env = z
    .object({
      MYSQL_DATABASE: z.string().trim().min(1),
      MYSQL_USER: z.string().trim().min(1),
      MYSQL_PASSWORD: z.string().optional().default(""),
      MYSQL_HOST: z.string().trim().optional().default("127.0.0.1"),
      MYSQL_PORT: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .default("3306")
        .transform(Number)
        .pipe(z.number().int().min(1).max(65535)),
    })
    .parse(process.env);

  return new Sequelize(env.MYSQL_DATABASE, env.MYSQL_USER, env.MYSQL_PASSWORD, {
    dialect: "mysql",
    host: env.MYSQL_HOST || "127.0.0.1",
    port: env.MYSQL_PORT,
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
      id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        validate: { notEmpty: true },
      },
      name: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true },
      },
      team: {
        type: DataTypes.STRING(128),
        allowNull: false,
        validate: { notEmpty: true },
      },
      environment: {
        type: DataTypes.STRING(64),
        allowNull: false,
        validate: { notEmpty: true },
      },
    },
    { tableName: "services", timestamps: false },
  );

  const Alert = sequelize.define<
    Model<AlertAttributes, AlertAttributes>,
    AlertAttributes
  >(
    "Alert",
    {
      id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        validate: { notEmpty: true },
      },
      serviceId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        references: { model: "services", key: "id" },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
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

  const Incident = sequelize.define<
    Model<IncidentAttributes, IncidentAttributes>,
    IncidentAttributes
  >(
    "Incident",
    {
      id: {
        type: DataTypes.STRING(64),
        primaryKey: true,
        allowNull: false,
        validate: { notEmpty: true },
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      serviceId: {
        type: DataTypes.STRING(64),
        allowNull: false,
        references: { model: "services", key: "id" },
      },
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

  Service.hasMany(Alert, { foreignKey: "serviceId", as: "alerts" });
  Alert.belongsTo(Service, { foreignKey: "serviceId", as: "service" });
  Service.hasMany(Incident, { foreignKey: "serviceId", as: "incidents" });
  Incident.belongsTo(Service, { foreignKey: "serviceId", as: "service" });

  return { Service, Alert, Incident };
}

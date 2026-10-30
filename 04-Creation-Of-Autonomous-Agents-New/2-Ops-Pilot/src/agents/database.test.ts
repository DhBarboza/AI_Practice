import assert from "node:assert/strict";
import test from "node:test";
import { Sequelize } from "sequelize";
import { defineOpsModels } from "./database.js";

test("Sequelize models define service foreign-key associations for alerts and incidents", async (t) => {
  const sequelize = new Sequelize(
    "mysql://ops-pilot:test@127.0.0.1:3306/ops_pilot",
    { logging: false },
  );
  t.after(async () => sequelize.close());

  const { Service, Alert, Incident } = defineOpsModels(sequelize);

  assert.equal(Alert.associations.service.target, Service);
  assert.equal(Incident.associations.service.target, Service);
  assert.equal(Service.associations.alerts.target, Alert);
  assert.equal(Service.associations.incidents.target, Incident);
  assert.equal(Alert.rawAttributes.serviceId.allowNull, false);
  assert.equal(Incident.rawAttributes.serviceId.allowNull, false);
});

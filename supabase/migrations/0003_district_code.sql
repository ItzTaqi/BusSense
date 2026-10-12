-- District route code entered by the rider (account side). The bus number derived from it is stored in declared_bus.
alter table riders add column if not exists district_code text;

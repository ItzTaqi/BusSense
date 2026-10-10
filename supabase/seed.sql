-- Fake demo data only. No real WCPSS data.
insert into routes(route_label, school_id, shape) values
 ('DEMO-12', 'demo-hs', 'LINESTRING(-78.790 35.790, -78.780 35.792, -78.770 35.794, -78.760 35.796)')
on conflict do nothing;
insert into stops(stop_id, route_label, seq, geom) values
 ('demo-1','DEMO-12',1,'POINT(-78.790 35.790)'),
 ('demo-2','DEMO-12',2,'POINT(-78.780 35.792)'),
 ('demo-3','DEMO-12',3,'POINT(-78.770 35.794)')
on conflict do nothing;

import { Router } from 'express';
import authRouter from './auth.routes.js';
import vehicleTypeRouter from './vehicle-type.routes.js';
import brandRouter from './brand.routes.js';
import modelRouter from './model.routes.js';
import fuelTypeRouter from './fuel-type.routes.js';
import vehicleRouter from './vehicle.routes.js';
import customerRouter from './customer.routes.js';
import employeeRouter from './employee.routes.js';
import seasonalRateRouter from './seasonal-rate.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/vehicle-types', vehicleTypeRouter);
router.use('/brands', brandRouter);
router.use('/models', modelRouter);
router.use('/fuel-types', fuelTypeRouter);
router.use('/vehicles', vehicleRouter);
router.use('/customers', customerRouter);
router.use('/employees', employeeRouter);
router.use('/seasonal-rates', seasonalRateRouter);

export default router;

import { Router } from 'express';
import { CatalogService } from '../../Application/services/catalog.service.js';

const router = Router();
const catalogService = new CatalogService();

// GET /api/catalog/vehicles
router.get('/vehicles', async (req, res, next) => {
  try {
    const { typeId, brandId, fuelTypeId, dateFrom, dateTo, seats } = req.query;
    const result = await catalogService.searchCatalogVehicles({
      typeId: typeId as string,
      brandId: brandId as string,
      fuelTypeId: fuelTypeId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      seats: seats ? parseInt(seats as string) : undefined,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/vehicles/:id
router.get('/vehicles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;
    const result = await catalogService.getCatalogVehicleDetail(
      id,
      dateFrom as string,
      dateTo as string
    );
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/vehicle-types
router.get('/vehicle-types', async (req, res, next) => {
  try {
    const result = await catalogService.listVehicleTypes({ status: 'ACTIVE', limit: 100 });
    res.status(200).json({ success: true, data: result.items });
  } catch (error) {
    next(error);
  }
});

// GET /api/catalog/brands
router.get('/brands', async (req, res, next) => {
  try {
    const result = await catalogService.listBrands({ status: 'ACTIVE', limit: 100 });
    res.status(200).json({ success: true, data: result.items });
  } catch (error) {
    next(error);
  }
});

export default router;

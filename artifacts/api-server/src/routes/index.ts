import { Router, type IRouter } from "express";
import healthRouter from "./health";
import farmsRouter from "./farms";
import cyclesRouter from "./cycles";
import mortalityRouter from "./mortality";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(farmsRouter);
router.use(cyclesRouter);
router.use(mortalityRouter);
router.use(dashboardRouter);

export default router;

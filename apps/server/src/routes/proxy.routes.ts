import { Router } from 'express';
import { handleProxyRequest } from '@/controllers/proxy.controller';

const router = Router();

router.post('/proxy', handleProxyRequest);

export const proxyRouter = router;

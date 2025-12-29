import { Router, Express } from 'express';
import { helloRouter } from './hello.routes';
import { proxyRouter } from './proxy.routes';

const routes = Router();

routes.use('/api', helloRouter);
routes.use('/api', proxyRouter); // 注册 Proxy 路由

export const initRoutes = (app: Express) => {
  app.use(routes);
  app.all(/^\/api\/.*$/, (req, res) => {
    console.warn(`⚠️ API 404: ${req.path}`);
    res.status(404).json({ success: false, error: '未找到API端点' });
  });
};

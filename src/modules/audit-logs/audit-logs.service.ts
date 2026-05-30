import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from '../../common/schemas/audit-log.schema';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async findAll(query: {
    page?: string;
    limit?: string;
    action?: string;
    module?: string;
  }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '15', 10);
    const skip = (page - 1) * limit;

    // Filtros dinámicos
    const filter: Record<string, any> = {};
    if (query.action) filter.action = query.action;
    if (query.module) filter.module = query.module.toLowerCase();

    // Consultas en paralelo para optimizar tiempos de respuesta
    const [docs, totalDocs, aggregateKpis] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.auditLogModel.countDocuments(filter),
      this.auditLogModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            create: { $sum: { $cond: [{ $eq: ['$action', 'CREATE'] }, 1, 0] } },
            update: { $sum: { $cond: [{ $eq: ['$action', 'UPDATE'] }, 1, 0] } },
            delete: { $sum: { $cond: [{ $eq: ['$action', 'DELETE'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const totalPages = Math.ceil(totalDocs / limit);
    const kpis: {
      total: number;
      create: number;
      update: number;
      delete: number;
    } = aggregateKpis[0] || {
      total: 0,
      create: 0,
      update: 0,
      delete: 0,
    };

    return {
      docs,
      totalDocs,
      totalPages,
      page,
      kpis: {
        total: kpis.total,
        create: kpis.create,
        update: kpis.update,
        delete: kpis.delete,
      },
    };
  }
}

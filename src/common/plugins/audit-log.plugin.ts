import { IUser } from '@/modules/users/interfaces/user.interface';
import { Schema, Document, Query, Model } from 'mongoose';
import { ClsService } from 'nestjs-cls';

interface AuditableQuery extends Query<any, any> {
  _previousState?: any;
}

interface AuditableDocument extends Document {
  _previousState?: any;
  $isNew?: boolean;
}

export function AuditLogPlugin(schema: Schema, cls: ClsService) {
  // 1. CAPTURAR EL "ANTES" EN CASO DE ACTUALIZACIONES O BORRADOS
  const preHooks = [
    'findOneAndUpdate',
    'updateOne',
    'deleteOne',
    'findOneAndDelete',
  ] as const;

  preHooks.forEach((hook) => {
    // SOLUCIÓN: Eliminamos el parámetro 'next' ya que async/await gestiona el flujo solo
    schema.pre(hook, async function (this: AuditableQuery) {
      try {
        const query = this.getQuery();
        const docToUpdate = await this.model.findOne(query).lean();
        if (docToUpdate) {
          this._previousState = docToUpdate;
        }
      } catch (err) {
        console.error('Error capturando estado anterior:', err);
      }
    });
  });

  // 2. REGISTRAR DESPUÉS DE UNA MODIFICACIÓN EXITOSA (CREATE o UPDATE)
  const postSaveHooks = ['save', 'findOneAndUpdate', 'updateOne'] as const;

  postSaveHooks.forEach((hook) => {
    schema.post(
      hook,
      async function (this: AuditableQuery, doc: AuditableDocument) {
        try {
          if (!doc) return;

          const user: IUser = cls.get('audit_user');
          const ip = cls.get('audit_ip') || '127.0.0.1';
          if (!user) return;

          const previousState = this._previousState;
          const newState =
            typeof doc.toObject === 'function' ? doc.toObject() : doc;

          let action = 'UPDATE';
          if (!previousState && '$isNew' in doc && doc.$isNew) {
            action = 'CREATE';
          }

          if (
            action === 'UPDATE' &&
            JSON.stringify(previousState) === JSON.stringify(newState)
          )
            return;

          const modelConstructor = doc.constructor as Model<any>;
          const AuditLogModel = modelConstructor.db.model('AuditLog');

          if (modelConstructor.modelName === 'AuditLog') return;

          await AuditLogModel.create({
            userId: user._id,
            userName: user.firstName + ' ' + user.lastName,
            module: modelConstructor.modelName.toLowerCase(),
            action,
            previousState,
            newState,
            ipAddress: ip,
          });
        } catch (err) {
          console.error('Error guardando bitácora post-mutación:', err);
        }
      },
    );
  });

  // 3. REGISTRAR DESPUÉS DE UN BORRADO EXITOSO (DELETE)
  const postDeleteHooks = ['deleteOne', 'findOneAndDelete'] as const;

  postDeleteHooks.forEach((hook) => {
    schema.post(hook, async function (this: AuditableQuery) {
      try {
        const user: IUser = cls.get('audit_user');
        const ip = cls.get('audit_ip') || '127.0.0.1';
        const previousState = this._previousState;

        if (!user || !previousState) return;

        const modelConstructor = this.model;
        const AuditLogModel = modelConstructor.db.model('AuditLog');

        if (modelConstructor.modelName === 'AuditLog') return;

        await AuditLogModel.create({
          userId: user._id,
          userName: user.firstName + ' ' + user.lastName,
          module: modelConstructor.modelName.toLowerCase(),
          action: 'DELETE',
          previousState,
          newState: null,
          ipAddress: ip,
        });
      } catch (err) {
        console.error('Error guardando bitácora post-delete:', err);
      }
    });
  });
}

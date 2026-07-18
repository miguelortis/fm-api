import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('should update an existing user and mark them as titular on registration', async () => {
    const userModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const usersService = {
      findByNationalId: jest.fn(),
    };

    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
    };

    const service = new AuthService(
      userModel as any,
      usersService as any,
      jwtService as any,
    );

    const existingUser = {
      _id: 'user-1',
      nationalId: '12345678',
      firstName: 'Juan',
      lastName: 'Pérez',
      isTitular: false,
      save: jest.fn().mockResolvedValue(true),
    };

    userModel.findOne.mockResolvedValue(existingUser);
    userModel.findByIdAndUpdate.mockResolvedValue({
      ...existingUser,
      firstName: 'Carlos',
      isTitular: true,
    });

    const result = await service.register({
      nationalId: '12345678',
      firstName: 'Carlos',
      lastName: 'Pérez',
      email: 'carlos@example.com',
      password: 'secret123',
      placeOfBirth: 'Caracas',
      address: 'Av. Principal',
      gender: 'M',
      birthDate: '2000-01-01',
      isTitular: true,
    } as any);

    expect(userModel.findOne).toHaveBeenCalled();
    expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(result.access_token).toBe('token');
    expect(result.user.nationalId).toBe('12345678');
  });
});

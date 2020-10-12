import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const existingCustomer = await this.customersRepository.findById(customer_id);

    if (!existingCustomer) {
      throw new AppError('Could not find a customer using this CustomerID.');
    }

    const productList = await this.productsRepository.findAllById(products);

    if (!productList) {
      throw new AppError('Could not find any product.');
    }

    const productListIds = productList.map(product => product.id);

    // console.log
    // console.log(`   `);
    // productListIds.map(item => {
    //   console.log(`productListIds ID: ${item}`);
    // });
    // console.log(
    //   `productListIds.includes(product.id):
    //   ${productListIds.includes('ad9a480b-d863-4c85-8eb6-303336bf1d19')}`,
    // );
    // products.map(item => console.log(`prod quant order: ${item.quantity}`));

    const checkProductsNotFound = products.filter(
      product => !productListIds.includes(product.id),
    );

    // console.log
    // products.map(item => {
    //   console.log(
    //     `item: ${item.id} -> !productListIds.includes(item.id):
    //     ${!productListIds.includes(item.id)}`,
    //   );
    // });

    if (checkProductsNotFound.length) {
      throw new AppError(
        `Could not find products: ${checkProductsNotFound[0].id}`,
      );
    } // time 01:31:58

    // console.log
    // productList.map(item => {
    //   products.map(product => {
    //     if (item.id === product.id) {
    //       console.log(`item id: ${item.id} -> quantity: ${item.quantity}`);
    //       console.log(
    //         `product id: ${product.id} -> quantity: ${product.quantity}`,
    //       );
    //     }
    //   });
    // });

    const productsWithoutAvailability = products.filter(
      product =>
        productList.filter(p => p.id === product.id)[0].quantity <
        product.quantity,
    );

    if (productsWithoutAvailability.length) {
      throw new AppError('Some products exceed the available quantity.');
    }

    const serializedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: productList.filter(p => p.id === product.id)[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer: existingCustomer,
      products: serializedProducts,
    });

    // // const { order_products } = order;

    const orderProductsQuantity = products.map(product => ({
      id: product.id,
      quantity:
        productList.filter(p => p.id === product.id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(orderProductsQuantity);

    return order;
  }
}

export default CreateOrderService;

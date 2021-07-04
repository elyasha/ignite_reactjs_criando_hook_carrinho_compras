import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find(p => p.id === productId);
      if (productAlreadyExists) {
        const {amount: productAmount} = productAlreadyExists;
        const {data: stock} = await api.get<Stock>(`stock/${productId}`)
        const productIsAvailableInStock = stock.amount > productAmount;

        if (!productIsAvailableInStock) {
          toast.error('Quantidade solicitada fora de estoque')
          return;
        }

        const updatedAmountCartProduct = cart.map(product => {
          return product.id === productId ? {...product, amount: productAmount + 1} : product;
        })

        setCart(updatedAmountCartProduct)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedAmountCartProduct))
        return;
      }

      const { data: productData } = await api.get(`products/${productId}`);
      const cartWithNewProduct = [...cart, {...productData, amount: 1}]

      setCart(cartWithNewProduct)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithNewProduct))
      return;

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productAlreadyExists = cart.find(p => p.id === productId)
      if (productAlreadyExists) {
        const carWithoutProduct = cart.filter(p => p.id !== productId)
        setCart(carWithoutProduct)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(carWithoutProduct))
        return;
      }
      toast.error('Erro na remoção do produto')
      return;
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const {data: stock} = await api.get<Stock>(`stock/${productId}`)
      const productIsAvailableInStock = stock.amount >= amount;
      if (!productIsAvailableInStock) { 
        toast.error('Quantidade solicitada fora de estoque')
        return;
      }

      const productAlreadyExists = cart.find(p => p.id === productId)
      
      if (productAlreadyExists) {
        const updatedCart = cart.map(product => {
          return product.id === productId ? {...product, amount: amount} : product;

        })

        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        return;
      }

      toast.error("Erro na alteração de quantidade do produto")
      return;

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

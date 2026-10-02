import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonicModule,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { Subscription } from 'rxjs';
import {
  add,
  arrowBack,
  cartOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  createOutline,
  trashOutline,
  star,
  ellipsisVertical,
  pricetagOutline,
  checkmarkOutline,
  closeOutline,
  alertCircleOutline,
  chevronDownOutline,
  chevronUpOutline,
  refreshOutline,
} from 'ionicons/icons';
import { ListService } from '../../../core/services/list.service';
import { ListItemService } from '../../../core/services/list-item.service';
import { ProductService } from '../../../core/services/product.service';
import { CategoryService } from '../../../core/services/category.service';
import { UserDefaultsService } from '../../../core/services/user-defaults.service';
import { StorageService, STORAGE_KEYS } from '../../../core/services/storage.service';
import {
  PricingEngineService,
  PricingSource,
  PricingState,
} from '../../../core/services/pricing-engine.service';
import { ShoppingList } from '../../../core/models/list.model';
import { ListItem } from '../../../core/models/list-item.model';
import { Product, ConversionType } from '../../../core/models/product.model';
import { UserDefaults } from '../../../core/models/user-defaults.model';

interface CategoryGroup {
  categoryId: string | null;
  categoryName: string;
  orderIndex: number;
  items: ListItem[];
}

@Component({
  selector: 'app-list-detail',
  templateUrl: './list-detail.page.html',
  styleUrls: ['./list-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ListDetailPage implements OnInit, OnDestroy {
  listId!: string;
  shoppingList: ShoppingList | null = null;
  groupedItems: CategoryGroup[] = [];
  allItems: ListItem[] = [];
  isLoading = false;
  private sub = new Subscription();
  private isLocalToggle = false;

  // Totais agregados
  totalCart = 0;
  totalPending = 0;
  totalGeneral = 0;

  userDefaults!: UserDefaults;

  // Controle do Modal de Inclusão/Edição
  isModalOpen = false;
  isEditing = false;
  editingItemId: string | null = null;
  viewMode: 'basic' | 'complete' = 'basic';

  // Catálogo para Autocomplete
  catalogProducts: Product[] = [];
  filteredCatalog: Product[] = [];
  productSearchTerm = '';
  selectedProduct: Product | null = null;

  // Formulário do Item
  formBrand = '';
  formQuantity = 1;
  formUnitPrimary = 'un';
  formConversionType: ConversionType = 'MULTIPLY';
  formConversionFactor = 1.0;
  formUnitSecondary = 'un';
  formUnitPricePrimary = 0.0;
  formPricePerSecondaryUnit = 0.0;
  formTotalPrice = 0.0;

  public currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listService: ListService,
    private listItemService: ListItemService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private userDefaultsService: UserDefaultsService,
    private storageService: StorageService,
    private pricingEngine: PricingEngineService,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    addIcons({
      add,
      arrowBack,
      cartOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      createOutline,
      trashOutline,
      star,
      ellipsisVertical,
      pricetagOutline,
      checkmarkOutline,
      closeOutline,
      alertCircleOutline,
      chevronDownOutline,
      chevronUpOutline,
      refreshOutline,
    });
  }

  async ngOnInit() {
    this.listId = this.route.snapshot.paramMap.get('id') || '';
    this.userDefaults = await this.userDefaultsService.get();
    this.viewMode = this.userDefaults.default_view_mode || 'basic';
    await this.carregarDados();

    this.sub.add(
      this.storageService.dataChanged$.subscribe((key) => {
        if (this.isLocalToggle) {
          return;
        }
        if (
          key === STORAGE_KEYS.LIST_ITEMS ||
          key === STORAGE_KEYS.LISTS ||
          key === STORAGE_KEYS.PRODUCTS ||
          key === '*'
        ) {
          this.ngZone.run(() => this.carregarDados(false));
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  ionViewWillEnter() {
    if (this.listId) {
      this.carregarDados(false);
    }
  }

  async carregarDados(showLoading = true) {
    if (showLoading && this.allItems.length === 0) {
      this.isLoading = true;
      this.cdr.detectChanges();
    }
    try {
      const [list, items, prods] = await Promise.all([
        this.listService.getById(this.listId),
        this.listItemService.getByListId(this.listId),
        this.productService.getAll(),
      ]);

      if (!list) {
        this.mostrarToast('Lista não encontrada.');
        this.router.navigate(['/lists']);
        return;
      }

      this.shoppingList = list;
      this.allItems = items;
      this.catalogProducts = prods;
      this.agruparItensPorCategoria(items);
      this.recalcularTotais();
    } catch (err) {
      console.error('Erro ao carregar dados da lista:', err);
      this.mostrarToast('Erro ao carregar dados.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  agruparItensPorCategoria(items: ListItem[]) {
    const groupsMap = new Map<string, CategoryGroup>();

    for (const item of items) {
      const key = item.category_id || 'OUTROS';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          categoryId: item.category_id || null,
          categoryName: item.category_name || 'OUTROS',
          orderIndex: item.category_order_index ?? 999,
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(item);
    }

    this.groupedItems = Array.from(groupsMap.values()).sort(
      (a, b) => a.orderIndex - b.orderIndex || a.categoryName.localeCompare(b.categoryName)
    );
  }

  recalcularTotais() {
    this.totalCart = this.allItems
      .filter((it) => it.is_checked === 1)
      .reduce((acc, it) => acc + (it.total_price || 0), 0);

    this.totalPending = this.allItems
      .filter((it) => it.is_checked === 0)
      .reduce((acc, it) => acc + (it.total_price || 0), 0);

    this.totalGeneral = this.totalCart + this.totalPending;
    this.cdr.detectChanges();
  }

  async toggleChecked(item: ListItem) {
    const novoStatus = item.is_checked === 1 ? 0 : 1;
    item.is_checked = novoStatus;
    this.recalcularTotais();

    this.isLocalToggle = true;
    try {
      await this.listItemService.toggleChecked(item.id, novoStatus === 1);
    } catch (err) {
      console.error('Erro ao alternar carrinho:', err);
      item.is_checked = novoStatus === 1 ? 0 : 1; // reverte em falha
      this.recalcularTotais();
    } finally {
      setTimeout(() => {
        this.isLocalToggle = false;
      }, 100);
    }
  }

  trackByGroupId(index: number, group: CategoryGroup): string {
    return group.categoryId || group.categoryName;
  }

  trackByItemId(index: number, item: ListItem): string {
    return item.id;
  }

  async abrirModalNovoItem() {
    this.isEditing = false;
    this.editingItemId = null;
    this.selectedProduct = null;
    this.productSearchTerm = '';
    this.filteredCatalog = [];

    this.formBrand = '';
    this.formQuantity = this.userDefaults.default_quantity || 1;
    this.formUnitPrimary = this.userDefaults.default_unit_primary || 'un';
    this.formConversionType = this.userDefaults.default_conversion_type || 'MULTIPLY';
    this.formConversionFactor = this.userDefaults.default_conversion_factor || 1.0;
    this.formUnitSecondary = this.userDefaults.default_unit_secondary || 'un';
    this.formUnitPricePrimary = 0.0;
    this.formPricePerSecondaryUnit = 0.0;
    this.formTotalPrice = 0.0;

    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  async editarItem(item: ListItem) {
    this.isEditing = true;
    this.editingItemId = item.id;
    this.selectedProduct =
      this.catalogProducts.find((p) => p.id === item.product_id) || null;
    this.productSearchTerm = item.product_name || '';
    this.filteredCatalog = [];

    this.formBrand = item.brand || '';
    this.formQuantity = item.purchase_quantity;
    this.formUnitPrimary = item.unit_primary;
    this.formConversionType = item.conversion_type;
    this.formConversionFactor = item.conversion_factor;
    this.formUnitSecondary = item.unit_secondary;
    this.formUnitPricePrimary = item.unit_price_primary;
    this.formPricePerSecondaryUnit = item.price_per_secondary_unit;
    this.formTotalPrice = item.total_price;

    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  fecharModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  onProductSearchInput(event: any) {
    const val = (event.detail.value || '').trim().toLowerCase();
    this.productSearchTerm = event.detail.value || '';
    if (!val) {
      this.filteredCatalog = [];
      return;
    }

    this.filteredCatalog = this.catalogProducts
      .filter((p) => p.name.toLowerCase().includes(val))
      .slice(0, 8);
  }

  selecionarProduto(prod: Product) {
    this.selectedProduct = prod;
    this.productSearchTerm = prod.name;
    this.formUnitPrimary = prod.unit_primary;
    this.formConversionType = prod.conversion_type;
    this.formConversionFactor = prod.conversion_factor;
    this.formUnitSecondary = prod.unit_secondary;
    this.filteredCatalog = [];

    // Recalcula campos com novos parâmetros
    this.onFieldChange('conversion');
  }

  // Fast-track: Cadastrar novo produto no catálogo instantaneamente
  async criarProdutoInline() {
    const nomeLimpo = this.productSearchTerm.trim();
    if (!nomeLimpo) {
      return;
    }

    try {
      const novoProduto = await this.productService.getOrCreateFastTrack(
        nomeLimpo,
        null,
        this.userDefaults
      );
      this.catalogProducts.push(novoProduto);
      this.selecionarProduto(novoProduto);
      this.mostrarToast(`Produto '${novoProduto.name}' criado no catálogo!`);
    } catch (err) {
      console.error('Erro no cadastro rápido:', err);
      this.mostrarToast('Erro ao cadastrar produto.');
    }
  }

  // Motor Reativo de Cálculos
  onFieldChange(source: PricingSource) {
    const state: PricingState = {
      purchase_quantity: Number(this.formQuantity) || 1,
      conversion_type: this.formConversionType,
      conversion_factor: Number(this.formConversionFactor) || 1,
      unit_price_primary: Number(this.formUnitPricePrimary) || 0,
      price_per_secondary_unit: Number(this.formPricePerSecondaryUnit) || 0,
      total_price: Number(this.formTotalPrice) || 0,
    };

    const newState = this.pricingEngine.recalculate(state, source);

    this.formUnitPricePrimary = newState.unit_price_primary;
    this.formPricePerSecondaryUnit = newState.price_per_secondary_unit;
    this.formTotalPrice = newState.total_price;
  }

  async alternarModoVisualizacao() {
    this.viewMode = this.viewMode === 'basic' ? 'complete' : 'basic';
    await this.userDefaultsService.update({ default_view_mode: this.viewMode });
    this.cdr.detectChanges();
  }

  async salvarItem() {
    if (!this.selectedProduct && !this.productSearchTerm.trim()) {
      this.mostrarToast('Informe ou selecione o produto.');
      return;
    }

    try {
      // Se não selecionou explicitamente do catálogo, cria via fast-track
      let prod = this.selectedProduct;
      if (!prod) {
        prod = await this.productService.getOrCreateFastTrack(
          this.productSearchTerm.trim(),
          null,
          this.userDefaults
        );
        this.catalogProducts.push(prod);
      }

      if (this.isEditing && this.editingItemId) {
        const itemExistente = this.allItems.find((it) => it.id === this.editingItemId);
        await this.listItemService.update({
          id: this.editingItemId,
          list_id: this.listId,
          product_id: prod.id,
          brand: this.formBrand.trim(),
          purchase_quantity: Number(this.formQuantity) || 1,
          unit_primary: this.formUnitPrimary || 'un',
          conversion_type: this.formConversionType,
          conversion_factor: Number(this.formConversionFactor) || 1.0,
          unit_secondary: this.formUnitSecondary || 'un',
          unit_price_primary: Number(this.formUnitPricePrimary) || 0,
          price_per_secondary_unit: Number(this.formPricePerSecondaryUnit) || 0,
          total_price: Number(this.formTotalPrice) || 0,
          is_checked: itemExistente?.is_checked || 0,
          created_at: itemExistente?.created_at || new Date().toISOString(),
        });
        this.mostrarToast('Item atualizado!');
      } else {
        await this.listItemService.create({
          list_id: this.listId,
          product_id: prod.id,
          brand: this.formBrand.trim(),
          purchase_quantity: Number(this.formQuantity) || 1,
          unit_primary: this.formUnitPrimary || 'un',
          conversion_type: this.formConversionType,
          conversion_factor: Number(this.formConversionFactor) || 1.0,
          unit_secondary: this.formUnitSecondary || 'un',
          unit_price_primary: Number(this.formUnitPricePrimary) || 0,
          price_per_secondary_unit: Number(this.formPricePerSecondaryUnit) || 0,
          total_price: Number(this.formTotalPrice) || 0,
          is_checked: 0,
        });
        this.mostrarToast('Item adicionado à lista!');
      }

      this.fecharModal();
      await this.carregarDados();
    } catch (err) {
      console.error('Erro ao salvar item:', err);
      this.mostrarToast('Erro ao salvar item.');
    }
  }

  async confirmarExclusaoItem(item: ListItem) {
    const alert = await this.alertController.create({
      header: 'Remover Item',
      message: `Deseja remover '${item.product_name}' da lista?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Remover',
          role: 'destructive',
          handler: () => {
            this.ngZone.run(async () => {
              try {
                await this.listItemService.delete(item.id);
                this.mostrarToast('Item removido.');
                await this.carregarDados();
              } catch (err) {
                console.error('Erro ao excluir item:', err);
                this.mostrarToast('Erro ao remover item.');
              }
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async limparCarrinho() {
    const alert = await this.alertController.create({
      header: 'Esvaziar Carrinho',
      message: 'Deseja desmarcar todos os itens comprados desta lista?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desmarcar Todos',
          handler: () => {
            this.ngZone.run(async () => {
              try {
                await this.listItemService.clearCart(this.listId);
                this.mostrarToast('Todos os itens foram desmarcados.');
                await this.carregarDados();
              } catch (err) {
                console.error('Erro ao esvaziar carrinho:', err);
                this.mostrarToast('Erro ao atualizar carrinho.');
              }
            });
          },
        },
      ],
    });

    await alert.present();
  }

  async renomearLista() {
    if (!this.shoppingList) return;

    const alert = await this.alertController.create({
      header: 'Renomear Lista',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: this.shoppingList.name,
          placeholder: 'Nome da lista',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Salvar',
          handler: (data) => {
            if (!data.name || data.name.trim() === '') {
              this.mostrarToast('O nome da lista não pode ser vazio.');
              return false;
            }
            this.ngZone.run(async () => {
              try {
                await this.listService.rename(this.listId, data.name);
                if (this.shoppingList) {
                  this.shoppingList.name = data.name.trim();
                }
                this.mostrarToast('Nome da lista atualizado!');
                this.cdr.detectChanges();
              } catch (err) {
                console.error('Erro ao renomear lista:', err);
                this.mostrarToast('Erro ao renomear lista.');
              }
            });
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  voltarParaListas() {
    this.router.navigate(['/lists']);
  }

  private async mostrarToast(mensagem: string) {
    const toast = await this.toastController.create({
      message: mensagem,
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}

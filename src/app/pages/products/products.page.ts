import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonicModule,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  searchOutline,
  createOutline,
  trashOutline,
  cubeOutline,
  filterOutline,
  closeOutline,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { StorageService, STORAGE_KEYS } from '../../core/services/storage.service';
import { Product, ConversionType } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class ProductsPage implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: Category[] = [];

  searchTerm = '';
  selectedCategoryId = '';
  isLoading = false;
  private sub = new Subscription();

  // Controle de Modal / Formulário de Produto
  isModalOpen = false;
  isEditing = false;
  currentProductId: string | null = null;
  formName = '';
  formCategoryId: string | null = null;
  formUnitPrimary = 'un';
  formConversionType: ConversionType = 'MULTIPLY';
  formConversionFactor = 1.0;
  formUnitSecondary = 'un';

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private storageService: StorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    addIcons({
      add,
      searchOutline,
      createOutline,
      trashOutline,
      cubeOutline,
      filterOutline,
      closeOutline,
      swapHorizontalOutline,
    });
  }

  ngOnInit() {
    this.carregarDados();

    this.sub.add(
      this.storageService.dataChanged$.subscribe((key) => {
        if (
          key === STORAGE_KEYS.PRODUCTS ||
          key === STORAGE_KEYS.CATEGORIES ||
          key === '*'
        ) {
          this.ngZone.run(() => this.carregarDados());
        }
      })
    );
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  ionViewWillEnter() {
    this.carregarDados();
  }

  async carregarDados() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const [prods, cats] = await Promise.all([
        this.productService.getAll(),
        this.categoryService.getAll(),
      ]);
      this.products = prods;
      this.categories = cats;
      this.aplicarFiltro();
    } catch (error) {
      console.error('Erro ao carregar catálogo de produtos:', error);
      this.mostrarToast('Erro ao carregar dados.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltro() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredProducts = this.products.filter((p) => {
      const matchesName = p.name.toLowerCase().includes(term);
      const matchesCategory =
        !this.selectedCategoryId || p.category_id === this.selectedCategoryId;
      return matchesName && matchesCategory;
    });
    this.cdr.detectChanges();
  }

  onSearchChange(event: any) {
    this.searchTerm = event.detail.value || '';
    this.aplicarFiltro();
  }

  onCategoryChange(event: any) {
    this.selectedCategoryId = event.detail.value || '';
    this.aplicarFiltro();
  }

  abrirNovoProduto() {
    this.isEditing = false;
    this.currentProductId = null;
    this.formName = '';
    this.formCategoryId = this.categories.length > 0 ? this.categories[0].id : null;
    this.formUnitPrimary = 'un';
    this.formConversionType = 'MULTIPLY';
    this.formConversionFactor = 1.0;
    this.formUnitSecondary = 'un';
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  editarProduto(prod: Product) {
    this.isEditing = true;
    this.currentProductId = prod.id;
    this.formName = prod.name;
    this.formCategoryId = prod.category_id;
    this.formUnitPrimary = prod.unit_primary;
    this.formConversionType = prod.conversion_type;
    this.formConversionFactor = prod.conversion_factor;
    this.formUnitSecondary = prod.unit_secondary;
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  fecharModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  async salvarProduto() {
    if (!this.formName || this.formName.trim() === '') {
      this.mostrarToast('O nome do produto é obrigatório.');
      return;
    }

    if (!this.formConversionFactor || this.formConversionFactor <= 0) {
      this.mostrarToast('O fator de conversão deve ser maior que zero.');
      return;
    }

    try {
      if (this.isEditing && this.currentProductId) {
        await this.productService.update({
          id: this.currentProductId,
          name: this.formName.trim(),
          category_id: this.formCategoryId,
          unit_primary: this.formUnitPrimary.trim().toLowerCase(),
          conversion_type: this.formConversionType,
          conversion_factor: Number(this.formConversionFactor),
          unit_secondary: this.formUnitSecondary.trim().toLowerCase(),
          created_at: new Date().toISOString(),
        });
        this.mostrarToast('Produto atualizado com sucesso!');
      } else {
        await this.productService.create({
          name: this.formName.trim(),
          category_id: this.formCategoryId,
          unit_primary: this.formUnitPrimary.trim().toLowerCase(),
          conversion_type: this.formConversionType,
          conversion_factor: Number(this.formConversionFactor),
          unit_secondary: this.formUnitSecondary.trim().toLowerCase(),
        });
        this.mostrarToast('Produto cadastrado com sucesso!');
      }

      this.fecharModal();
      await this.carregarDados();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      this.mostrarToast(
        error?.message?.includes('UNIQUE')
          ? 'Já existe um produto com este nome.'
          : 'Erro ao salvar produto.'
      );
    }
  }

  async confirmarExclusao(prod: Product) {
    const can = await this.productService.canDelete(prod.id);
    if (!can) {
      const alert = await this.alertController.create({
        header: 'Exclusão Bloqueada',
        message: `O produto '${prod.name}' já foi utilizado em compras anteriores e não pode ser excluído para preservar seu histórico de preços.`,
        buttons: ['OK'],
      });
      await alert.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Excluir Produto',
      message: `Deseja realmente excluir '${prod.name}'?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: () => {
            this.ngZone.run(async () => {
              try {
                await this.productService.delete(prod.id);
                this.mostrarToast('Produto excluído com sucesso.');
                await this.carregarDados();
              } catch (err: any) {
                this.mostrarToast(err?.message || 'Erro ao excluir produto.');
              }
            });
          },
        },
      ],
    });

    await alert.present();
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

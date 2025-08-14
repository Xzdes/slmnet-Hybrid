/**
 * @file slmnet.js
 * @description slmnet-gatekeeper v1.0 - Автономная библиотека для нейросетей.
 * Содержит классы для тензоров, слоев и оптимизаторов. Не имеет внешних зависимостей.
 */

// Мы помещаем всю библиотеку внутрь самовызывающейся функции (IIFE),
// чтобы не загрязнять глобальное пространство имен. Наружу будет торчать только один объект - `slmnet`.
const slmnet = (() => {

    // ===== 1. КЛАСС TENSOR =====
    // Фундаментальный N-мерный контейнер данных с поддержкой автодифференцирования.

    class Tensor {
        constructor(data, shape, requires_grad = false, _ctx = null) {
            this.data = data instanceof Float32Array ? data : new Float32Array(data);
            this.shape = shape;
            this.size = this.data.length;
            this.requires_grad = requires_grad;
            this.grad = this.requires_grad ? new Tensor(new Float32Array(this.size), this.shape) : null;
            this._ctx = _ctx; // Контекст для графа вычислений
        }

        static from(arr, requires_grad = false) {
            const { flatData, inferredShape } = Tensor._inferShapeAndFlatten(arr);
            return new Tensor(flatData, inferredShape, requires_grad);
        }

        static zeros(shape, requires_grad = false) {
            const size = shape.reduce((a, b) => a * b, 1);
            return new Tensor(new Float32Array(size), shape, requires_grad);
        }

        static random(shape, requires_grad = false) {
            const size = shape.reduce((a, b) => a * b, 1);
            const data = Float32Array.from({ length: size }, () => Math.random() * 2 - 1);
            return new Tensor(data, shape, requires_grad);
        }

        static _inferShapeAndFlatten(arr) {
            const flatData = [];
            const inferredShape = [];
            let currentLevel = arr;
            while (Array.isArray(currentLevel)) {
                if (currentLevel.length === 0) break;
                inferredShape.push(currentLevel.length);
                currentLevel = currentLevel[0];
            }
            const flatten = (subArr) => {
                for (const el of subArr) {
                    if (Array.isArray(el)) flatten(el);
                    else flatData.push(el);
                }
            };
            flatten(arr);
            return { flatData, inferredShape };
        }

        backward() {
            if (!this.requires_grad) throw new Error("backward() нельзя вызывать у тензора с requires_grad=false.");
            if (this.size !== 1) throw new Error("backward() можно вызывать только у скалярного тензора (например, у ошибки).");

            const buildGraph = (tensor, visited, sortedGraph) => {
                if (visited.has(tensor)) return;
                visited.add(tensor);
                if (tensor._ctx) {
                    tensor._ctx.inputs.forEach(input => buildGraph(input, visited, sortedGraph));
                    sortedGraph.push(tensor);
                }
            };
            const visited = new Set();
            const sortedGraph = [];
            buildGraph(this, visited, sortedGraph);

            this.grad = new Tensor([1.0], [1]);

            for (let i = sortedGraph.length - 1; i >= 0; i--) {
                const tensor = sortedGraph[i];
                if (tensor._ctx && typeof tensor._ctx.backward === 'function') {
                    tensor._ctx.backward(tensor.grad);
                }
            }
        }
        
        // --- ОПЕРАЦИИ, ВОЗВРАЩАЮЩИЕ НОВЫЙ ТЕНЗОР С КОНТЕКСТОМ ---

        add(other) {
            const result = new Tensor(this.data.map((v, i) => v + other.data[i]), this.shape, this.requires_grad || other.requires_grad);
            if (result.requires_grad) {
                result._ctx = {
                    inputs: [this, other],
                    backward: (upstream_grad) => {
                        if (this.requires_grad) this.grad.data.forEach((_, i) => this.grad.data[i] += upstream_grad.data[i]);
                        if (other.requires_grad) other.grad.data.forEach((_, i) => other.grad.data[i] += upstream_grad.data[i]);
                    }
                };
            }
            return result;
        }

        mul(other) {
            const result = new Tensor(this.data.map((v, i) => v * other.data[i]), this.shape, this.requires_grad || other.requires_grad);
            if (result.requires_grad) {
                result._ctx = {
                    inputs: [this, other],
                    backward: (upstream_grad) => {
                        if (this.requires_grad) this.grad.data.forEach((_, i) => this.grad.data[i] += other.data[i] * upstream_grad.data[i]);
                        if (other.requires_grad) other.grad.data.forEach((_, i) => other.grad.data[i] += this.data[i] * upstream_grad.data[i]);
                    }
                };
            }
            return result;
        }
        
        pow(n) {
            const result = new Tensor(this.data.map(v => Math.pow(v, n)), this.shape, this.requires_grad);
            if (result.requires_grad) {
                result._ctx = {
                    inputs: [this],
                    backward: (upstream_grad) => {
                        if (this.requires_grad) this.grad.data.forEach((_, i) => this.grad.data[i] += (n * Math.pow(this.data[i], n - 1)) * upstream_grad.data[i]);
                    }
                };
            }
            return result;
        }
        
        sum() {
            const sumResult = this.data.reduce((acc, val) => acc + val, 0);
            const result = new Tensor([sumResult], [1], this.requires_grad);
            if (result.requires_grad) {
                 result._ctx = {
                    inputs: [this],
                    backward: (upstream_grad) => {
                       if (this.requires_grad) this.grad.data.forEach((_, i) => this.grad.data[i] += upstream_grad.data[0]);
                    }
                };
            }
            return result;
        }

        dot(other) {
            const [rowsA, colsA] = this.shape;
            const [rowsB, colsB] = other.shape;
            if (colsA !== rowsB) throw new Error(`Несовместимые формы для матричного умножения: [${this.shape}] и [${other.shape}].`);

            const resultShape = [rowsA, colsB];
            const resultData = new Float32Array(rowsA * colsB).fill(0);
            for (let i = 0; i < rowsA; i++) {
                for (let j = 0; j < colsB; j++) {
                    for (let k = 0; k < colsA; k++) {
                        resultData[i * colsB + j] += this.data[i * colsA + k] * other.data[k * colsB + j];
                    }
                }
            }
            const result = new Tensor(resultData, resultShape, this.requires_grad || other.requires_grad);
            if (result.requires_grad) {
                result._ctx = {
                    inputs: [this, other],
                    backward: (upstream_grad) => {
                        if (this.requires_grad) {
                            for (let i = 0; i < rowsA; i++) { for (let j = 0; j < colsA; j++) {
                                let sum = 0;
                                for (let k = 0; k < colsB; k++) sum += upstream_grad.data[i * colsB + k] * other.data[j * colsB + k];
                                this.grad.data[i * colsA + j] += sum;
                            }}
                        }
                        if (other.requires_grad) {
                           for (let i = 0; i < rowsB; i++) { for (let j = 0; j < colsB; j++) {
                                let sum = 0;
                                for (let k = 0; k < rowsA; k++) sum += this.data[k * colsA + i] * upstream_grad.data[k * colsB + j];
                                other.grad.data[i * colsB + j] += sum;
                            }}
                        }
                    }
                };
            }
            return result;
        }
    }

    // ===== 2. КЛАССЫ СЛОЕВ (LAYERS) =====

    class Layer {
        parameters() { return []; }
        forward() { throw new Error("Метод forward() должен быть реализован в дочернем классе."); }
    }

    class Dense extends Layer {
        constructor(in_features, out_features) {
            super();
            const limit = Math.sqrt(2 / in_features);
            this.weights = Tensor.random([in_features, out_features], true);
            this.weights.data.forEach((_, i) => this.weights.data[i] *= limit);
            this.bias = Tensor.zeros([1, out_features], true);
        }
        
        forward(inputs) {
            // Вещание (broadcasting) смещения реализуется прямо здесь
            const matmul_result = inputs.dot(this.weights);
            const outputData = new Float32Array(matmul_result.size);
            const [rows, cols] = matmul_result.shape;
             for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    outputData[i * cols + j] = matmul_result.data[i * cols + j] + this.bias.data[j];
                }
            }
            const result = new Tensor(outputData, matmul_result.shape, matmul_result.requires_grad || this.bias.requires_grad);
            
            if(result.requires_grad) {
                result._ctx = {
                    inputs: [matmul_result, this.bias],
                    backward: (upstream_grad) => {
                        if (matmul_result.requires_grad) matmul_result.grad.data.forEach((_,i) => matmul_result.grad.data[i] += upstream_grad.data[i]);
                        if (this.bias.requires_grad) {
                            for (let j = 0; j < cols; j++) {
                                let sum = 0;
                                for (let i = 0; i < rows; i++) sum += upstream_grad.data[i * cols + j];
                                this.bias.grad.data[j] += sum;
                            }
                        }
                    }
                }
            }
            return result;
        }

        parameters() { return [this.weights, this.bias]; }
    }

    class ReLU extends Layer {
        forward(inputs) {
            const result = new Tensor(inputs.data.map(v => Math.max(0, v)), inputs.shape, inputs.requires_grad);
            if (result.requires_grad) {
                result._ctx = {
                    inputs: [inputs],
                    backward: (upstream_grad) => {
                        if (inputs.requires_grad) inputs.grad.data.forEach((_, i) => inputs.grad.data[i] += (inputs.data[i] > 0 ? 1 : 0) * upstream_grad.data[i]);
                    }
                };
            }
            return result;
        }
    }
    
    // Softmax более подходит для классификации, чем Sigmoid
    class Softmax extends Layer {
        forward(inputs) {
            const maxVal = Math.max(...inputs.data);
            const exps = inputs.data.map(x => Math.exp(x - maxVal));
            const sumExps = exps.reduce((a, b) => a + b, 0);
            const resultData = exps.map(e => e / sumExps);
            // Softmax не участвует в обратном распространении ошибки в этой упрощенной реализации,
            // т.к. мы будем использовать его в связке с CrossEntropyLoss, которая вычисляет градиент эффективнее.
            return new Tensor(resultData, inputs.shape, false);
        }
    }

    class Sequential extends Layer {
        constructor(layers) {
            super();
            this.layers = layers;
        }
        
        forward(inputs) {
            let current_output = inputs;
            for (const layer of this.layers) {
                current_output = layer.forward(current_output);
            }
            return current_output;
        }

        parameters() {
            const params = [];
            for (const layer of this.layers) {
                params.push(...layer.parameters());
            }
            return params;
        }
    }
    
    // ===== 3. КЛАССЫ ОПТИМИЗАТОРОВ (OPTIMIZERS) =====

    class Optimizer {
        constructor(parameters, learning_rate) {
            this.parameters = parameters;
            this.lr = learning_rate;
        }

        step() { throw new Error("Метод step() должен быть реализован в дочернем классе."); }

        zero_grad() {
            for (const p of this.parameters) {
                if (p.grad) p.grad.data.fill(0);
            }
        }
    }

    class SGD extends Optimizer {
        step() {
            for (const p of this.parameters) {
                if (p.grad) {
                    p.data.forEach((val, i) => { p.data[i] -= this.lr * p.grad.data[i]; });
                }
            }
        }
    }

    // ===== 4. ФУНКЦИИ ПОТЕРЬ (LOSS FUNCTIONS) =====
    // Это не слои, а функции для вычисления ошибки модели
    
    const crossEntropyLoss = (y_pred, y_true_index) => {
        // y_pred - это выход модели ДО Softmax (логиты)
        // y_true_index - это индекс правильного класса (0, 1, 2...)
        
        // Эффективное вычисление Softmax и Log
        const maxLogit = Math.max(...y_pred.data);
        const exps = y_pred.data.map(logit => Math.exp(logit - maxLogit));
        const sumExps = exps.reduce((a,b) => a + b, 0);
        const logSumExps = Math.log(sumExps);
        
        // Loss = -log(probability_of_correct_class)
        const loss_val = - (y_pred.data[y_true_index] - maxLogit - logSumExps);
        const loss = new Tensor([loss_val], [1], y_pred.requires_grad);
        
        // Градиент для обратного распространения
        if (loss.requires_grad) {
             loss._ctx = {
                inputs: [y_pred],
                backward: () => {
                   const softmax_output = exps.map(e => e / sumExps);
                   if(y_pred.requires_grad) {
                        y_pred.grad.data.forEach((_, i) => {
                           const delta = i === y_true_index ? 1.0 : 0.0;
                           y_pred.grad.data[i] += softmax_output[i] - delta;
                        });
                   }
                }
            };
        }
        return loss;
    };


    // ===== 5. ЭКСПОРТ БИБЛИОТЕКИ =====

    return {
        Tensor,
        layers: {
            Dense,
            ReLU,
            Softmax, // Экспортируем новый слой
            Sequential
        },
        optimizers: {
            SGD
        },
        losses: {
            crossEntropyLoss // Экспортируем функцию потерь
        }
    };

})();
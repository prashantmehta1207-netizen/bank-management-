const BankApp = (() => {
    const ACCOUNT_KEY = "digitalBank.accounts";
    const TRANSACTION_KEY = "digitalBank.transactions";

    const currency = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    function getAccounts() {
        return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "[]");
    }

    function saveAccounts(accounts) {
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
    }

    function getTransactions() {
        return JSON.parse(localStorage.getItem(TRANSACTION_KEY) || "[]");
    }

    function saveTransactions(transactions) {
        localStorage.setItem(TRANSACTION_KEY, JSON.stringify(transactions));
    }

    function clean(value) {
        return String(value || "").trim();
    }

    function money(value) {
        return currency.format(Number(value || 0));
    }

    function uniqueId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showMessage(text, type = "error") {
        const message = document.getElementById("message");
        if (!message) {
            return;
        }

        message.textContent = text;
        message.className = `notice ${type}`;
    }

    function createTransaction(accountNo, type, amount) {
        const transactions = getTransactions();
        transactions.push({
            id: uniqueId(),
            accountNo,
            type,
            amount,
            createdAt: new Date().toISOString()
        });
        saveTransactions(transactions);
    }

    function validateAccount(formData) {
        const account = {
            id: uniqueId(),
            name: clean(formData.get("name")),
            accountNo: clean(formData.get("accountNo")).toUpperCase(),
            phone: clean(formData.get("phone")),
            email: clean(formData.get("email")).toLowerCase(),
            accountType: clean(formData.get("accountType")),
            balance: Number(formData.get("balance")),
            createdAt: new Date().toISOString()
        };

        if (!account.name || !account.accountNo || !account.phone || !account.email || !account.accountType) {
            throw new Error("Please fill all required fields.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) {
            throw new Error("Please enter a valid email address.");
        }

        if (!Number.isFinite(account.balance) || account.balance < 0) {
            throw new Error("Initial deposit must be zero or more.");
        }

        const duplicate = getAccounts().some((item) => item.accountNo === account.accountNo);
        if (duplicate) {
            throw new Error("This account number already exists.");
        }

        return account;
    }

    function bindCreateForm() {
        const form = document.getElementById("createAccountForm");
        if (!form) {
            return;
        }

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            try {
                const account = validateAccount(new FormData(form));
                const accounts = getAccounts();
                accounts.push(account);
                saveAccounts(accounts);
                createTransaction(account.accountNo, "opening", account.balance);
                window.location.href = `success.html?accountNo=${encodeURIComponent(account.accountNo)}`;
            } catch (error) {
                showMessage(error.message, "error");
            }
        });
    }

    function renderDashboard() {
        const accounts = getAccounts();
        const transactions = getTransactions();
        const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

        document.getElementById("totalAccounts").textContent = accounts.length;
        document.getElementById("totalBalance").textContent = money(totalBalance);
        document.getElementById("totalTransactions").textContent = transactions.length;
    }

    function accountRows(accounts) {
        if (accounts.length === 0) {
            return `<div class="table-wrap"><p class="empty-state">No accounts found. Create your first account.</p></div>`;
        }

        const rows = accounts.map((account) => `
            <tr>
                <td>${escapeHtml(account.accountNo)}</td>
                <td>${escapeHtml(account.name)}</td>
                <td>${escapeHtml(account.accountType)}</td>
                <td>${escapeHtml(account.phone)}</td>
                <td>${escapeHtml(account.email)}</td>
                <td>${money(account.balance)}</td>
                <td>
                    <button class="btn btn-danger" data-delete="${escapeHtml(account.accountNo)}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join("");

        return `
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Account No</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Balance</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderAccountsPage() {
        const search = document.getElementById("accountSearch");
        const table = document.getElementById("accountsTable");

        function render() {
            const query = clean(search.value).toLowerCase();
            const accounts = getAccounts().filter((account) => {
                const text = `${account.name} ${account.accountNo} ${account.email} ${account.phone}`.toLowerCase();
                return text.includes(query);
            });
            table.innerHTML = accountRows(accounts);
        }

        search.addEventListener("input", render);
        table.addEventListener("click", (event) => {
            const button = event.target.closest("[data-delete]");
            if (!button) {
                return;
            }

            const accountNo = button.dataset.delete;
            const account = getAccounts().find((item) => item.accountNo === accountNo);
            if (!account || !confirm(`Delete account ${account.accountNo}?`)) {
                return;
            }

            saveAccounts(getAccounts().filter((item) => item.accountNo !== accountNo));
            saveTransactions(getTransactions().filter((item) => item.accountNo !== accountNo));
            render();
        });

        render();
    }

    function renderSuccessPage() {
        const params = new URLSearchParams(window.location.search);
        const accountNo = params.get("accountNo");
        const account = getAccounts().find((item) => item.accountNo === accountNo);
        const target = document.getElementById("successDetails");

        if (!account) {
            target.innerHTML = `<div class="notice error">Account details were not found.</div>`;
            return;
        }

        target.innerHTML = `
            <div class="account-details">
                <div class="detail-row">
                    <span class="detail-label">Account Holder</span>
                    <span class="detail-value">${escapeHtml(account.name)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Account Number</span>
                    <span class="detail-value">${escapeHtml(account.accountNo)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Account Type</span>
                    <span class="detail-value">${escapeHtml(account.accountType)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone</span>
                    <span class="detail-value">${escapeHtml(account.phone)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${escapeHtml(account.email)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Balance</span>
                    <span class="detail-value">${money(account.balance)}</span>
                </div>
            </div>
        `;
    }

    function renderAccountOptions() {
        const select = document.getElementById("accountNo");
        const accounts = getAccounts();

        if (accounts.length === 0) {
            select.innerHTML = `<option value="">No accounts available</option>`;
            select.disabled = true;
            return;
        }

        select.innerHTML = accounts.map((account) => (
            `<option value="${escapeHtml(account.accountNo)}">${escapeHtml(account.accountNo)} - ${escapeHtml(account.name)} (${money(account.balance)})</option>`
        )).join("");
    }

    function transactionRows() {
        const accounts = getAccounts();
        const transactions = getTransactions().slice().reverse();

        if (transactions.length === 0) {
            return `<div class="table-wrap"><p class="empty-state">No transactions yet.</p></div>`;
        }

        const rows = transactions.map((transaction) => {
            const account = accounts.find((item) => item.accountNo === transaction.accountNo);
            const date = new Date(transaction.createdAt).toLocaleString();

            return `
                <tr>
                    <td>${escapeHtml(date)}</td>
                    <td>${escapeHtml(transaction.accountNo)}</td>
                    <td>${escapeHtml(account ? account.name : "Deleted account")}</td>
                    <td>${escapeHtml(transaction.type)}</td>
                    <td>${money(transaction.amount)}</td>
                </tr>
            `;
        }).join("");

        return `
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Account No</th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function renderTransactionsPage() {
        const form = document.getElementById("transactionForm");
        const table = document.getElementById("transactionsTable");

        renderAccountOptions();
        table.innerHTML = transactionRows();

        form.addEventListener("submit", (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const accountNo = clean(formData.get("accountNo"));
            const type = clean(formData.get("type"));
            const amount = Number(formData.get("amount"));
            const accounts = getAccounts();
            const account = accounts.find((item) => item.accountNo === accountNo);

            if (!account) {
                showMessage("Please create an account first.", "error");
                return;
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                showMessage("Amount must be more than zero.", "error");
                return;
            }

            if (type === "withdraw" && amount > Number(account.balance)) {
                showMessage("Withdrawal amount is greater than current balance.", "error");
                return;
            }

            account.balance = type === "deposit"
                ? Number(account.balance) + amount
                : Number(account.balance) - amount;

            saveAccounts(accounts);
            createTransaction(accountNo, type, amount);
            form.reset();
            renderAccountOptions();
            table.innerHTML = transactionRows();
            showMessage("Transaction saved successfully.", "success");
        });
    }

    return {
        bindCreateForm,
        renderAccountsPage,
        renderDashboard,
        renderSuccessPage,
        renderTransactionsPage
    };
})();

# Tài liệu yêu cầu kỹ thuật: Tích hợp luồng Đăng ký Hợp tác (Pricing)

Tài liệu này mô tả chi tiết các yêu cầu về Cơ sở dữ liệu (Database), API và Bảo mật để đội phát triển Backend (BE) xây dựng các dịch vụ phục vụ cho tính năng Đăng ký hợp tác từ trang Pricing và quản lý duyệt thông tin từ phía Admin.

---

## 1. Thiết kế Cơ sở dữ liệu (Database)

Cần tạo bảng `PricingRequest` (hoặc `B2BRequest`) trong cơ sở dữ liệu để lưu trữ thông tin đăng ký của khách hàng.

### Cấu trúc bảng `PricingRequests`

| Tên trường (Field) | Kiểu dữ liệu | Ràng buộc (Constraints) | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | `Guid` (hoặc `Int` tự tăng) | Khóa chính (Primary Key) | Định danh duy nhất cho mỗi yêu cầu |
| `Email` | `Varchar(255)` | Bắt buộc (Required) | Địa chỉ email của người đăng ký |
| `CompanyName` | `Nvarchar(255)` | Bắt buộc (Required) | Tên doanh nghiệp / Đơn vị tổ chức |
| `PhoneNumber` | `Varchar(20)` | Bắt buộc (Required) | Số điện thoại liên hệ |
| `Website` | `Varchar(500)` | Tùy chọn (Optional, Nullable) | Link website chính thức |
| `Fanpage` | `Varchar(500)` | Tùy chọn (Optional, Nullable) | Link Fanpage chính thức |
| `PlanId` | `Varchar(50)` | Bắt buộc (Required) | Gói dịch vụ đăng ký (ví dụ: `students`, `small`, `medium`, `large`, `custom`) |
| `Status` | `Varchar(20)` | Mặc định: `Pending` | Trạng thái duyệt: `Pending` (Chờ duyệt), `Approved` (Đã duyệt), `Rejected` (Từ chối) |
| `CreatedAt` | `DateTime` | Mặc định: `UtcNow` | Thời gian gửi yêu cầu |
| `UpdatedAt` | `DateTime` | Mặc định: `UtcNow` | Thời gian cập nhật trạng thái gần nhất |

---

## 2. Đặc tả các API Endpoints

### 2.1. Đăng ký yêu cầu hợp tác (Pricing Request)
* **Endpoint**: `POST /api/pricing-requests`
* **Quyền truy cập**: Public (Không yêu cầu đăng nhập)
* **Request Body** (JSON):
  ```json
  {
    "email": "example@company.com",
    "companyName": "Công ty TNHH Giải Trí ABC",
    "phoneNumber": "0912345678",
    "website": "https://abc-entertainment.vn",
    "fanpage": "https://facebook.com/abcentertainment",
    "planId": "medium"
  }
  ```
* **Validation**:
  - `email` phải đúng định dạng email, bắt buộc.
  - `companyName` bắt buộc, không để trống.
  - `phoneNumber` bắt buộc, đúng định dạng số điện thoại.
  - `planId` phải thuộc danh sách gói hợp lệ: `students`, `small`, `medium`, `large`, `custom`.
* **Response**:
  - **201 Created**: Gửi yêu cầu thành công.
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "Pending",
      "createdAt": "2026-06-25T09:27:00Z"
    }
    ```
  - **400 Bad Request**: Dữ liệu đầu vào không hợp lệ.

---

### 2.2. Lấy danh sách yêu cầu hợp tác (Dành cho Admin)
* **Endpoint**: `GET /api/pricing-requests`
* **Quyền truy cập**: Admin duy nhất (`Authorize(Roles = "Admin")`)
* **Query Parameters (Tùy chọn)**:
  - `status`: Lọc theo trạng thái (`Pending`, `Approved`, `Rejected`)
  - `page`: Trang cần lấy (mặc định: 1)
  - `pageSize`: Số lượng yêu cầu trên mỗi trang (mặc định: 20)
* **Response**:
  - **200 OK**:
    ```json
    {
      "items": [
        {
          "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "email": "example@company.com",
          "companyName": "Công ty TNHH Giải Trí ABC",
          "phoneNumber": "0912345678",
          "website": "https://abc-entertainment.vn",
          "fanpage": "https://facebook.com/abcentertainment",
          "planId": "medium",
          "status": "Pending",
          "createdAt": "2026-06-25T09:27:00Z"
        }
      ],
      "totalCount": 1,
      "page": 1,
      "pageSize": 20
    }
    ```
  - **401 Unauthorized** / **403 Forbidden**: Chưa đăng nhập hoặc không có quyền Admin.

---

### 2.3. Cập nhật trạng thái duyệt yêu cầu (Dành cho Admin)
* **Endpoint**: `PUT /api/pricing-requests/{id}/status`
* **Quyền truy cập**: Admin duy nhất (`Authorize(Roles = "Admin")`)
* **Request Body** (JSON):
  ```json
  {
    "status": "Approved" // Hoặc "Rejected", "Pending"
  }
  ```
* **Validation**:
  - `status` chỉ được phép nhận các giá trị: `Approved`, `Rejected`.
* **Response**:
  - **200 OK**: Cập nhật thành công.
    ```json
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "Approved",
      "updatedAt": "2026-06-25T09:30:00Z"
    }
    ```
  - **404 Not Found**: Yêu cầu không tồn tại.
  - **401 Unauthorized** / **403 Forbidden**: Thiếu quyền truy cập.

---

## 3. Quy trình nghiệp vụ gợi ý (Business Logic Workflow)

1. Khi một yêu cầu được tạo mới, hệ thống tự động gán trạng thái `Pending`.
2. Hệ thống Backend có thể bổ sung chức năng **gửi email tự động** (qua SMTP/SendGrid):
   - Gửi một email thông báo đến hòm thư quản trị (`linkie.project@gmail.com`) báo rằng có yêu cầu hợp tác mới.
   - Gửi email xác nhận tiếp nhận yêu cầu thành công đến địa chỉ email của khách hàng để tạo sự chuyên nghiệp.
3. Khi Admin bấm duyệt (`Approved`) trên trang Dashboard:
   - Cập nhật trạng thái trong Database.
   - (Tùy chọn) Gửi một email chúc mừng tự động hoặc thông tin bước tiếp theo cho khách hàng.

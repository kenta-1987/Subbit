import { 
  type User, 
  type InsertUser, 
  type Video,
  type InsertVideo,
  type Caption,
  type InsertCaption,
  type UpdateCaption,
  type EmailVerificationToken,
  type PasswordResetToken,
  type RegisterUser,
  type Payment,
  type InsertPayment
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User methods (kept from original)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserEmailVerified(id: number): Promise<User>;
  
  // Email verification methods
  createEmailVerificationToken(email: string, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  deleteEmailVerificationToken(token: string): Promise<void>;
  
  // Password reset methods
  createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  resetUserPassword(email: string, newPassword: string): Promise<User>;
  
  // Video methods
  getVideo(id: number): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideoStatus(id: number, status: string): Promise<Video>;
  updateVideoDuration(id: number, duration: number): Promise<Video>;
  updateVideoError(id: number, error: string): Promise<Video>;
  
  // Caption methods
  getCaption(id: number): Promise<Caption | undefined>;
  getCaptionsByVideoId(videoId: number): Promise<Caption[]>;
  createCaption(caption: InsertCaption): Promise<Caption>;
  updateCaption(id: number, caption: Partial<Caption>): Promise<Caption>;
  deleteCaption(id: number): Promise<void>;
  
  // Storage management methods
  updateUserStorageUsage(userId: number, additionalBytes: number): Promise<User>;
  getUserStorageUsage(userId: number): Promise<number>;
  
  // Admin methods
  getAllUsers(): Promise<User[]>;
  getAllVideos(): Promise<Video[]>;
  updateUserPlan(id: number, plan: string): Promise<User>;
  deleteVideo(id: number): Promise<void>;
  
  // Profile methods
  updateUserProfile(id: number, updates: { username: string; email: string }): Promise<User>;
  updateUserPassword(id: number, newPassword: string): Promise<void>;
  
  // Stripe methods
  updateUserStripeCustomerId(id: number, customerId: string): Promise<User>;
  updateUserSubscription(id: number, subscription: { subscriptionId: string; status: string; currentPeriodEnd: Date }): Promise<User>;
  
  // Payment methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByUserId(userId: number): Promise<Payment[]>;
  getMonthlyRevenue(year: number, month: number): Promise<number>;
  getRevenueStats(): Promise<{ totalRevenue: number; monthlyRevenue: number; activeSubscriptions: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private videos: Map<number, Video>;
  private captions: Map<number, Caption>;
  private emailTokens: Map<string, EmailVerificationToken>;
  private passwordResetTokens: Map<string, PasswordResetToken>;
  private payments: Map<number, Payment>;
  private userId: number;
  private videoId: number;
  private captionId: number;
  private tokenId: number;
  private paymentId: number;

  constructor() {
    this.users = new Map();
    this.videos = new Map();
    this.captions = new Map();
    this.emailTokens = new Map();
    this.passwordResetTokens = new Map();
    this.payments = new Map();
    this.userId = 1;
    this.videoId = 1;
    this.captionId = 1;
    this.tokenId = 1;
    this.paymentId = 1;
    
    // Initialize with some test data
    this.initializeTestData();
  }

  private initializeTestData() {
    // Add test users
    const testUsers = [
      {
        id: this.userId++,
        username: "admin",
        password: "admin123",
        email: "admin@example.com",
        emailVerified: true,
        plan: "pro",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        monthlyUploads: 5,
        lastUploadReset: new Date(),
        createdAt: new Date()
      },
      {
        id: this.userId++,
        username: "user1",
        password: "password",
        email: "user1@example.com",
        emailVerified: true,
        plan: "starter",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: "active",
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        monthlyUploads: 2,
        lastUploadReset: new Date(),
        createdAt: new Date()
      },
      {
        id: this.userId++,
        username: "user2",
        password: "password",
        email: "user2@example.com",
        emailVerified: true,
        plan: "free",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: "inactive",
        currentPeriodEnd: null,
        monthlyUploads: 1,
        lastUploadReset: new Date(),
        createdAt: new Date()
      }
    ];

    testUsers.forEach(user => {
      this.users.set(user.id, user as User);
    });

    // Add sample payment data
    const samplePayments = [
      {
        id: this.paymentId++,
        userId: 1,
        stripePaymentIntentId: "pi_test_123",
        stripeSubscriptionId: "sub_test_123",
        amount: 980000, // 9,800円 in cents
        currency: "jpy",
        plan: "business",
        status: "succeeded",
        paymentMethod: "card",
        description: "Business プラン - 月額料金",
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: this.paymentId++,
        userId: 2,
        stripePaymentIntentId: "pi_test_456",
        stripeSubscriptionId: "sub_test_456",
        amount: 298000, // 2,980円 in cents
        currency: "jpy",
        plan: "starter",
        status: "succeeded",
        paymentMethod: "card",
        description: "Starter プラン - 月額料金",
        paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        id: this.paymentId++,
        userId: 1,
        stripePaymentIntentId: "pi_test_789",
        stripeSubscriptionId: "sub_test_123",
        amount: 980000, // 9,800円 in cents
        currency: "jpy",
        plan: "business",
        status: "succeeded",
        paymentMethod: "card",
        description: "Business プラン - 月額料金",
        paidAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago (last month)
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
      }
    ];

    samplePayments.forEach(payment => {
      this.payments.set(payment.id, payment as Payment);
    });
  }

  // User methods (kept from original)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email,
      emailVerified: false,
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "inactive",
      currentPeriodEnd: null,
      monthlyUploads: 0,
      lastUploadReset: new Date(),
      storageUsed: 0,
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserEmailVerified(id: number): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error(`User with id ${id} not found`);
    
    const updatedUser: User = {
      ...user,
      emailVerified: true
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Email verification methods
  async createEmailVerificationToken(email: string, token: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const emailToken: EmailVerificationToken = {
      id: this.tokenId++,
      email,
      token,
      expiresAt,
      createdAt: new Date()
    };
    
    this.emailTokens.set(token, emailToken);
    return emailToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    return this.emailTokens.get(token);
  }

  async deleteEmailVerificationToken(token: string): Promise<void> {
    this.emailTokens.delete(token);
  }

  // Password reset methods
  async createPasswordResetToken(email: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const passwordResetToken: PasswordResetToken = {
      id: this.tokenId++,
      email,
      token,
      expiresAt,
      createdAt: new Date()
    };
    
    this.passwordResetTokens.set(token, passwordResetToken);
    return passwordResetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    return this.passwordResetTokens.get(token);
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    this.passwordResetTokens.delete(token);
  }

  async resetUserPassword(email: string, newPassword: string): Promise<User> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    const updatedUser: User = {
      ...user,
      password: newPassword
    };

    this.users.set(user.id, updatedUser);
    return updatedUser;
  }
  
  // Video methods
  async getVideo(id: number): Promise<Video | undefined> {
    console.log(`動画取得試行: ID=${id}`);
    console.log(`現在のvideos Map keys:`, Array.from(this.videos.keys()));
    const video = this.videos.get(id);
    console.log(`取得結果:`, video ? `見つかりました` : `見つかりません`);
    return video;
  }
  
  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const id = this.videoId++;
    const now = new Date();
    
    const video: Video = {
      id,
      filename: insertVideo.filename,
      originalPath: insertVideo.originalPath,
      processedPath: null,
      status: "uploaded",
      uploadedAt: now,
      fileSize: insertVideo.fileSize,
      duration: null,
      error: null
    };
    
    this.videos.set(id, video);
    console.log(`動画をメモリストレージに保存: ID=${id}, ファイル=${insertVideo.filename}`);
    console.log(`現在のvideos Map:`, Array.from(this.videos.keys()));
    return video;
  }
  
  async updateVideoStatus(id: number, status: string): Promise<Video> {
    const video = this.videos.get(id);
    if (!video) throw new Error(`Video with id ${id} not found`);
    
    const updatedVideo: Video = {
      ...video,
      status
    };
    
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }
  
  async updateVideoDuration(id: number, duration: number): Promise<Video> {
    const video = this.videos.get(id);
    if (!video) throw new Error(`Video with id ${id} not found`);
    
    const updatedVideo: Video = {
      ...video,
      duration
    };
    
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }
  
  async updateVideoError(id: number, error: string): Promise<Video> {
    const video = this.videos.get(id);
    if (!video) throw new Error(`Video with id ${id} not found`);
    
    const updatedVideo: Video = {
      ...video,
      status: "failed",
      error
    };
    
    this.videos.set(id, updatedVideo);
    return updatedVideo;
  }
  
  // Caption methods
  async getCaption(id: number): Promise<Caption | undefined> {
    return this.captions.get(id);
  }
  
  async getCaptionsByVideoId(videoId: number): Promise<Caption[]> {
    return Array.from(this.captions.values())
      .filter(caption => caption.videoId === videoId)
      .sort((a, b) => a.startTime - b.startTime);
  }
  
  async createCaption(insertCaption: InsertCaption): Promise<Caption> {
    const id = this.captionId++;
    
    const caption: Caption = {
      id,
      videoId: insertCaption.videoId,
      startTime: insertCaption.startTime,
      endTime: insertCaption.endTime,
      text: insertCaption.text,
      font: insertCaption.font || "gothic",
      fontSize: insertCaption.fontSize || "medium",
      color: insertCaption.color || "white",
      hasBackground: insertCaption.hasBackground ?? true
    };
    
    this.captions.set(id, caption);
    return caption;
  }
  
  async updateCaption(id: number, updateData: Partial<Caption>): Promise<Caption> {
    const caption = this.captions.get(id);
    if (!caption) throw new Error(`Caption with id ${id} not found`);
    
    const updatedCaption: Caption = {
      ...caption,
      ...updateData
    };
    
    this.captions.set(id, updatedCaption);
    return updatedCaption;
  }
  
  async deleteCaption(id: number): Promise<void> {
    if (!this.captions.has(id)) {
      throw new Error(`Caption with id ${id} not found`);
    }
    
    this.captions.delete(id);
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getAllVideos(): Promise<Video[]> {
    return Array.from(this.videos.values());
  }

  async updateUserPlan(id: number, plan: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      plan
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteVideo(id: number): Promise<void> {
    if (!this.videos.has(id)) {
      throw new Error(`Video with id ${id} not found`);
    }

    // Delete associated captions
    const captions = await this.getCaptionsByVideoId(id);
    for (const caption of captions) {
      this.captions.delete(caption.id);
    }

    this.videos.delete(id);
  }

  // Profile methods
  async updateUserProfile(id: number, updates: { username: string; email: string }): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      username: updates.username,
      email: updates.email
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(id: number, newPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      password: newPassword
    };

    this.users.set(id, updatedUser);
  }

  // Storage management methods
  async updateUserStorageUsage(userId: number, additionalBytes: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    const updatedUser: User = {
      ...user,
      storageUsed: (user.storageUsed || 0) + additionalBytes
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserStorageUsage(userId: number): Promise<number> {
    const user = this.users.get(userId);
    return user?.storageUsed || 0;
  }

  // Stripe methods
  async updateUserStripeCustomerId(id: number, customerId: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      stripeCustomerId: customerId
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserSubscription(id: number, subscription: { subscriptionId: string; status: string; currentPeriodEnd: Date }): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }

    const updatedUser: User = {
      ...user,
      stripeSubscriptionId: subscription.subscriptionId,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Payment methods
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    const payment: Payment = {
      id,
      userId: insertPayment.userId,
      stripePaymentIntentId: insertPayment.stripePaymentIntentId || null,
      stripeSubscriptionId: insertPayment.stripeSubscriptionId || null,
      amount: insertPayment.amount,
      currency: insertPayment.currency || "jpy",
      plan: insertPayment.plan,
      status: insertPayment.status,
      paymentMethod: insertPayment.paymentMethod || null,
      description: insertPayment.description || null,
      paidAt: insertPayment.paidAt || null,
      createdAt: new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      payment => payment.userId === userId
    );
  }

  async getMonthlyRevenue(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    return Array.from(this.payments.values())
      .filter(payment => 
        payment.status === 'succeeded' &&
        payment.paidAt &&
        payment.paidAt >= startDate &&
        payment.paidAt <= endDate
      )
      .reduce((total, payment) => total + payment.amount, 0);
  }

  async getRevenueStats(): Promise<{ totalRevenue: number; monthlyRevenue: number; activeSubscriptions: number }> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Total revenue (all successful payments)
    const totalRevenue = Array.from(this.payments.values())
      .filter(payment => payment.status === 'succeeded')
      .reduce((total, payment) => total + payment.amount, 0);

    // Monthly revenue (current month)
    const monthlyRevenue = await this.getMonthlyRevenue(currentYear, currentMonth);

    // Active subscriptions
    const activeSubscriptions = Array.from(this.users.values())
      .filter(user => user.subscriptionStatus === 'active').length;

    return {
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions
    };
  }
}

export const storage = new MemStorage();

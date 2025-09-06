import { test, expect } from '@playwright/test';

test.describe('Spatial Runtime Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the spatial demo page', async ({ page }) => {
    await expect(page).toHaveTitle('FIR Spatial Runtime Demo');
    
    // Check for essential UI elements
    await expect(page.locator('.info-panel h3')).toContainText('FIR Spatial Runtime Demo');
    await expect(page.locator('#zoom-level')).toBeVisible();
    await expect(page.locator('#semantic-level')).toBeVisible();
    await expect(page.locator('#element-count')).toBeVisible();
  });

  test('should display initial semantic level and zoom', async ({ page }) => {
    // Check initial state
    await expect(page.locator('#zoom-level')).toContainText('1.00x');
    await expect(page.locator('#semantic-level')).toContainText('standard');
    await expect(page.locator('#semantic-level')).toHaveClass(/standard/);
  });

  test('should change semantic levels with zoom buttons', async ({ page }) => {
    // Test Universal level
    await page.click('button:has-text("Universal")');
    await expect(page.locator('#zoom-level')).toContainText('0.05x');
    await expect(page.locator('#semantic-level')).toContainText('universal');
    await expect(page.locator('#semantic-level')).toHaveClass(/universal/);

    // Test System level
    await page.click('button:has-text("System")');
    await expect(page.locator('#zoom-level')).toContainText('0.30x');
    await expect(page.locator('#semantic-level')).toContainText('system');
    await expect(page.locator('#semantic-level')).toHaveClass(/system/);

    // Test Atomic level
    await page.click('button:has-text("Atomic")');
    await expect(page.locator('#zoom-level')).toContainText('3.00x');
    await expect(page.locator('#semantic-level')).toContainText('atomic');
    await expect(page.locator('#semantic-level')).toHaveClass(/atomic/);

    // Back to Standard
    await page.click('button:has-text("Standard")');
    await expect(page.locator('#zoom-level')).toContainText('1.00x');
    await expect(page.locator('#semantic-level')).toContainText('standard');
  });

  test('should add and display spatial elements', async ({ page }) => {
    // Check initial element count
    await expect(page.locator('#element-count')).toContainText('5');

    // Clear elements first
    await page.click('button:has-text("Clear All")');
    await expect(page.locator('#element-count')).toContainText('0');
    
    // Verify no spatial forms are visible
    await expect(page.locator('.spatial-form')).toHaveCount(0);

    // Add elements
    await page.click('button:has-text("Add Elements")');
    await expect(page.locator('#element-count')).toContainText('5');
    
    // Verify spatial forms are added
    await expect(page.locator('.spatial-form')).toHaveCount(5);
  });

  test('should position HTML overlay elements correctly', async ({ page }) => {
    // Ensure elements are present
    await page.click('button:has-text("Clear All")');
    await page.click('button:has-text("Add Elements")');
    
    // Check that forms are positioned as absolute elements
    const forms = page.locator('.spatial-form');
    await expect(forms).toHaveCount(5);
    
    // Verify each form has proper positioning
    for (let i = 0; i < 5; i++) {
      const form = forms.nth(i);
      await expect(form).toHaveCSS('position', 'absolute');
      
      // Check that each form has different positions
      const style = await form.getAttribute('style');
      expect(style).toContain('left:');
      expect(style).toContain('top:');
    }
  });

  test('should handle semantic level element visibility', async ({ page }) => {
    // Ensure we have elements
    await page.click('button:has-text("Clear All")');
    await page.click('button:has-text("Add Elements")');
    
    // At standard level, all forms should be visible
    await page.click('button:has-text("Standard")');
    const visibleForms = page.locator('.spatial-form:visible');
    await expect(visibleForms).toHaveCount(5);

    // At universal level, only first 3 should be visible (per the demo logic)
    await page.click('button:has-text("Universal")');
    await page.waitForTimeout(100); // Allow transition
    
    const visibleFormsUniversal = page.locator('.spatial-form:visible');
    await expect(visibleFormsUniversal).toHaveCount(3);
  });

  test('should apply semantic zoom transforms', async ({ page }) => {
    // Ensure we have elements
    await page.click('button:has-text("Clear All")');
    await page.click('button:has-text("Add Elements")');
    
    // Test different zoom levels affect transform scaling
    await page.click('button:has-text("Standard")'); // zoom = 1.0
    const formStandard = page.locator('.spatial-form').first();
    let transform = await formStandard.evaluate(el => window.getComputedStyle(el).transform);
    // Browsers return different formats: "scale(1)" or "matrix(1, 0, 0, 1, 0, 0)" or "none"
    expect(transform === 'scale(1)' || transform === 'matrix(1, 0, 0, 1, 0, 0)' || transform === 'none').toBeTruthy();

    // Test atomic level scaling (zoom = 3.0, but capped at 2.0 in demo)
    await page.click('button:has-text("Atomic")');
    await page.waitForTimeout(100);
    const formAtomic = page.locator('.spatial-form').first();
    transform = await formAtomic.evaluate(el => window.getComputedStyle(el).transform);
    // Check for scale(2) or matrix equivalent, browsers may return different formats
    expect(transform === 'scale(2)' || transform === 'matrix(2, 0, 0, 2, 0, 0)' || transform.includes('scale(2)') || transform.includes('matrix(2')).toBeTruthy();
  });

  test('should handle mouse wheel zoom interaction', async ({ page }) => {
    // Test mouse wheel zoom
    const container = page.locator('#spatial-container');
    
    // Get initial zoom level
    const initialZoom = await page.locator('#zoom-level').textContent();
    expect(initialZoom).toBe('1.00x');
    
    // Simulate zoom in (wheel down)
    await container.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(100);
    
    const zoomedInLevel = await page.locator('#zoom-level').textContent();
    const zoomedInValue = parseFloat(zoomedInLevel?.replace('x', '') || '1.0');
    expect(zoomedInValue).toBeGreaterThan(1.0);

    // Simulate zoom out (wheel up)
    await page.mouse.wheel(0, 100); // Zoom out
    await page.waitForTimeout(100);
    
    const zoomedOutLevel = await page.locator('#zoom-level').textContent();
    const zoomedOutValue = parseFloat(zoomedOutLevel?.replace('x', '') || '1.0');
    expect(zoomedOutValue).toBeLessThan(zoomedInValue);
  });

  test('should interact with form elements', async ({ page }) => {
    // Ensure we have elements
    await page.click('button:has-text("Clear All")');
    await page.click('button:has-text("Add Elements")');
    
    // Test form interaction
    const firstForm = page.locator('.spatial-form').first();
    const nameInput = firstForm.locator('input[type="text"]');
    const messageTextarea = firstForm.locator('textarea');
    const submitButton = firstForm.locator('button');
    
    // Fill out the form
    await nameInput.fill('Test User');
    await messageTextarea.fill('This is a test message');
    
    // Verify form values
    await expect(nameInput).toHaveValue('Test User');
    await expect(messageTextarea).toHaveValue('This is a test message');
    
    // Check button is clickable
    await expect(submitButton).toBeEnabled();
  });

  test('should maintain form functionality across zoom levels', async ({ page }) => {
    // Ensure we have elements
    await page.click('button:has-text("Clear All")');
    await page.click('button:has-text("Add Elements")');
    
    // Fill form at standard level
    const firstForm = page.locator('.spatial-form').first();
    const nameInput = firstForm.locator('input[type="text"]');
    await nameInput.fill('Test at Standard');
    
    // Change zoom level
    await page.click('button:has-text("Atomic")');
    await page.waitForTimeout(100);
    
    // Verify form still works and retains value
    await expect(nameInput).toHaveValue('Test at Standard');
    await nameInput.fill('Test at Atomic');
    await expect(nameInput).toHaveValue('Test at Atomic');
    
    // Change back to standard
    await page.click('button:has-text("Standard")');
    await page.waitForTimeout(100);
    
    // Value should persist
    await expect(nameInput).toHaveValue('Test at Atomic');
  });

  test('should handle performance metrics display', async ({ page }) => {
    // Check that performance info is displayed
    const performanceText = page.locator('.info-panel p').last();
    await expect(performanceText).toContainText('Try zooming in/out');
    
    // Verify semantic level descriptions are present
    await expect(performanceText).toContainText('0.01-0.1x: Universal');
    await expect(performanceText).toContainText('0.1-0.5x: System');
    await expect(performanceText).toContainText('0.5-2.0x: Standard');
    await expect(performanceText).toContainText('2.0x+: Atomic');
  });
});
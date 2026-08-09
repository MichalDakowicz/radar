import { applyFaceImages, facesNeedingImages } from '@/lib/recapFaces';
import type { FaceEntry } from '@/lib/recap';

function face(overrides: Partial<FaceEntry>): FaceEntry {
  return { name: 'Someone', count: 1, ratio: 1, id: 1, initials: 'SO', image: null, ...overrides };
}

describe('facesNeedingImages', () => {
  it('asks only for the ones with an id and no photo', () => {
    const actors = [
      face({ id: 1, image: 'https://img/1.jpg' }),
      face({ id: 2 }),
      face({ id: null }),
      face({ id: 3 }),
    ];
    expect(facesNeedingImages(actors)).toEqual([2, 3]);
  });

  it('asks for nothing when every face is already photographed', () => {
    expect(facesNeedingImages([face({ image: 'https://img/1.jpg' })])).toEqual([]);
  });
});

describe('applyFaceImages', () => {
  it('fills the gaps and leaves stored photos alone', () => {
    const actors = [face({ id: 1, image: 'https://stored/1.jpg' }), face({ id: 2 }), face({ id: 3 })];
    // Id 3 is someone TMDB has no photo of, which is an answer, not a failure.
    const filled = applyFaceImages(actors, { 2: 'https://tmdb/2.jpg', 3: null });

    expect(filled.map((f) => f.image)).toEqual(['https://stored/1.jpg', 'https://tmdb/2.jpg', null]);
  });
});
